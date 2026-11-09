-- Phase 1 schema (SPEC §5). Every table: client-generated uuid v7 ids, server-set updated_at,
-- soft delete via deleted_at, RLS user_id = auth.uid().

create table public.collections (
  id            uuid primary key,
  user_id       uuid not null default auth.uid() references auth.users on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 80),
  position      int  not null default 0,
  tint          text check (tint ~ '^#[0-9A-Fa-f]{6}$'),
  cover_item_id uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table public.items (
  id               uuid primary key,
  user_id          uuid not null default auth.uid() references auth.users on delete cascade,
  collection_id    uuid references public.collections on delete set null,
  source_url       text not null check (source_url ~* '^https?://' and length(source_url) <= 4096),
  shared_title     text check (length(shared_title) <= 1000),
  canonical_url    text,
  kind             text check (kind in ('article', 'video', 'post', 'image', 'link')),
  adapter          text,
  status           text not null default 'pending'
                   check (status in ('pending', 'extracting', 'ready', 'failed')),
  extract_error    text,

  title            text,
  raw_title        text,
  summary          text,
  tags             text[],
  site_name        text,
  author           text,
  published_at     timestamptz,
  duration_s       int,
  reading_min      int,
  thumb_path       text,
  thumb_w          int,
  thumb_h          int,
  palette          jsonb,
  post             jsonb,
  embed            jsonb,

  ai_collection_id uuid,
  ai_confidence    real check (ai_confidence between 0 and 1),

  read_at          timestamptz,
  progress         real check (progress between 0 and 1),
  last_opened_at   timestamptz,
  rediscovered_on  date,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  deleted_at       timestamptz
);

create table public.item_content (
  item_id    uuid primary key references public.items on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users on delete cascade,
  html       text,
  text       text,
  word_count int,
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

-- Pull queries: where user_id = ? and updated_at > :cursor
create index collections_user_updated on public.collections (user_id, updated_at);
create index items_user_updated       on public.items (user_id, updated_at);
create index item_content_user_updated on public.item_content (user_id, updated_at);
create index items_collection          on public.items (collection_id) where deleted_at is null;

-- updated_at is always the server's clock, so pull cursors never miss a row.
-- clock_timestamp() (not now()) keeps rows written in one transaction distinguishable.
create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := clock_timestamp();
  return new;
end;
$$;

create trigger collections_touch  before insert or update on public.collections
  for each row execute function public.touch_updated_at();
create trigger items_touch        before insert or update on public.items
  for each row execute function public.touch_updated_at();
create trigger item_content_touch before insert or update on public.item_content
  for each row execute function public.touch_updated_at();

-- An item may only be filed into one of its owner's own collections.
create function public.check_item_collection_owner() returns trigger
language plpgsql as $$
begin
  if new.collection_id is not null and not exists (
    select 1 from public.collections c
    where c.id = new.collection_id and c.user_id = new.user_id
  ) then
    raise exception 'collection % does not belong to the item owner', new.collection_id
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger items_collection_owner before insert or update of collection_id, user_id on public.items
  for each row execute function public.check_item_collection_owner();

-- RLS: one policy per table, for every command.
alter table public.collections  enable row level security;
alter table public.items        enable row level security;
alter table public.item_content enable row level security;

create policy collections_owner on public.collections
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy items_owner on public.items
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy item_content_owner on public.item_content
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Clients soft-delete; hard deletes are server-only.
revoke delete on public.collections, public.items, public.item_content from authenticated, anon;
revoke all on public.collections, public.items, public.item_content from anon;

-- Realtime: the sheet and the list listen to their own item rows (RLS applies).
alter publication supabase_realtime add table public.items;

-- Storage: private bucket, objects under {user_id}/...
insert into storage.buckets (id, name, public) values ('media', 'media', false)
  on conflict (id) do nothing;

create policy media_owner_read on storage.objects
  for select to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_update on storage.objects
  for update to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy media_owner_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = (select auth.uid())::text);
