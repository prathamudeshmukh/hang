-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(7);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000e1', 'e@test.local');

-- Count only this test's requests; other rows may already be queued.
create temp table baseline as select coalesce(max(id), 0) as last_id from net.http_request_queue;
create temp view new_requests as
  select q.* from net.http_request_queue q, baseline b where q.id > b.last_id;

-- Not configured yet: the insert still succeeds and nothing is sent.
delete from vault.secrets where name in ('extract_url', 'extract_secret');
insert into public.items (id, user_id, source_url) values
  ('30000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000e1', 'https://unconfigured.example/');
select is((select count(*) from new_requests), 0::bigint, 'without vault config, an insert sends nothing');

select vault.create_secret('http://functions.test/extract', 'extract_url');
select vault.create_secret('pgtap-secret', 'extract_secret');

-- Insert as the owner, as the app does.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000e1","role":"authenticated"}', true);
insert into public.items (id, source_url) values ('30000000-0000-0000-0000-000000000002', 'https://private.example/secret-path');
reset role;

select is((select count(*) from new_requests), 1::bigint, 'a pending insert enqueues one request');
select is(
  (select convert_from(body, 'utf8')::jsonb from new_requests),
  '{"item_id": "30000000-0000-0000-0000-000000000002"}'::jsonb,
  'the body carries only the item id');
select is(
  (select headers ->> 'authorization' from new_requests),
  'Bearer pgtap-secret', 'the request carries the shared secret');
select is((select url from new_requests), 'http://functions.test/extract', 'the request goes to the configured url');

update public.items set collection_id = null, title = 'edited' where id = '30000000-0000-0000-0000-000000000002';
insert into public.items (id, user_id, source_url) values
  ('30000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000e1', 'https://private.example/secret-path')
  on conflict (id) do nothing;
select is((select count(*) from new_requests), 1::bigint, 'updates and duplicate creates send nothing');

insert into public.items (id, user_id, source_url, status) values
  ('30000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-0000000000e1', 'https://done.example/', 'ready');
select is((select count(*) from new_requests), 1::bigint, 'an item that is not pending sends nothing');

select * from finish();
rollback;
