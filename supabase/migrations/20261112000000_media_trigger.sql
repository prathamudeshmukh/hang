-- Slice #26: `extract` writes the lead image's address to `image_url`; setting it asks the `media` Edge Function
-- for a thumbnail, its size and a palette (SPEC §4 media step). The function URL lives in Vault (`media_url`);
-- both functions share `extract_secret`.

alter table public.items
  add column image_url text check (image_url ~* '^https?://' and length(image_url) <= 4096);

-- One sender for every item trigger: only the id travels (SPEC §7), the target and secret come from Vault.
create function public.post_item_to_function(url_secret text, item_id uuid) returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  function_secret text;
begin
  select decrypted_secret into function_url from vault.decrypted_secrets where name = url_secret;
  select decrypted_secret into function_secret from vault.decrypted_secrets where name = 'extract_secret';
  if function_url is null or function_secret is null then
    raise warning '% is not configured in vault; item % is not sent', url_secret, item_id;
    return;
  end if;

  -- pg_net is asynchronous, so the long timeout never holds up the write.
  perform net.http_post(
    url := function_url,
    body := jsonb_build_object('item_id', item_id),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || function_secret
    ),
    timeout_milliseconds := 60000
  );
end;
$$;

revoke all on function public.post_item_to_function(text, uuid) from public, anon, authenticated;

create or replace function public.enqueue_extract() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.post_item_to_function('extract_url', new.id);
  return new;
end;
$$;

create function public.enqueue_media() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Only the server sets image_url: no JWT (SQL, migrations) or the service role. A client writing it (RLS allows
  -- any column on its own rows) must not be able to make the server fetch arbitrary addresses on demand.
  -- nullif: the setting reads '' (not null) once anything set it earlier in the session.
  if coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role', 'service_role') <> 'service_role' then
    return new;
  end if;
  perform public.post_item_to_function('media_url', new.id);
  return new;
end;
$$;

revoke all on function public.enqueue_media() from public, anon, authenticated;

create trigger items_enqueue_media
  after update of image_url on public.items
  for each row
  when (new.image_url is not null and new.image_url is distinct from old.image_url and new.deleted_at is null)
  execute function public.enqueue_media();
