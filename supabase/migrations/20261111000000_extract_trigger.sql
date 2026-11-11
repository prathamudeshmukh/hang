-- Slice 8: a new pending item asks the `extract` Edge Function to fill it in (SPEC §4).
-- The function URL and its shared secret live in Vault (`extract_url`, `extract_secret`), so this
-- migration carries no project values. Without them the trigger warns and the item stays pending.

create extension if not exists pg_net with schema extensions;

create function public.enqueue_extract() returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  function_url text;
  function_secret text;
begin
  select decrypted_secret into function_url from vault.decrypted_secrets where name = 'extract_url';
  select decrypted_secret into function_secret from vault.decrypted_secrets where name = 'extract_secret';
  if function_url is null or function_secret is null then
    raise warning 'extract is not configured (vault extract_url / extract_secret); item % stays pending', new.id;
    return new;
  end if;

  -- Only the id travels: pg_net keeps request rows, and URLs must never sit next to a user (SPEC §7).
  -- pg_net is asynchronous, so the long timeout never holds up the insert.
  perform net.http_post(
    url := function_url,
    body := jsonb_build_object('item_id', new.id),
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || function_secret
    ),
    timeout_milliseconds := 60000
  );
  return new;
end;
$$;

revoke all on function public.enqueue_extract() from public, anon, authenticated;

-- Insert only: a duplicate create (upsert, ignore duplicates) inserts nothing and fires nothing.
create trigger items_enqueue_extract
  after insert on public.items
  for each row
  when (new.status = 'pending')
  execute function public.enqueue_extract();
