-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(10);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000a1', 'm@test.local');

create temp table baseline as select coalesce(max(id), 0) as last_id from net.http_request_queue;
create temp view new_requests as
  select q.* from net.http_request_queue q, baseline b where q.id > b.last_id;

insert into public.items (id, user_id, source_url, status) values
  ('40000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-0000000000a1', 'https://a.example/', 'ready'),
  ('40000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-0000000000a1', 'https://b.example/', 'ready');

-- Not configured yet: the update still succeeds and nothing is sent.
delete from vault.secrets where name in ('media_url', 'extract_secret');
update public.items set image_url = 'https://cdn.example/unconfigured.jpg' where id = '40000000-0000-0000-0000-000000000001';
select is((select count(*) from new_requests), 0::bigint, 'without vault config, setting image_url sends nothing');

select vault.create_secret('http://functions.test/media', 'media_url');
select vault.create_secret('pgtap-secret', 'extract_secret');

-- As the server (no user JWT), like extract's service-role write.
update public.items set image_url = 'https://cdn.example/private/lead.jpg' where id = '40000000-0000-0000-0000-000000000001';
select is((select count(*) from new_requests), 1::bigint, 'a new image_url enqueues one request');
select is((select url from new_requests), 'http://functions.test/media', 'the request goes to the media url');
select is(
  (select convert_from(body, 'utf8')::jsonb from new_requests),
  '{"item_id": "40000000-0000-0000-0000-000000000001"}'::jsonb,
  'the body carries only the item id');
select is((select headers ->> 'authorization' from new_requests), 'Bearer pgtap-secret', 'the request carries the shared secret');

update public.items set image_url = 'https://cdn.example/private/lead.jpg', title = 'same image' where id = '40000000-0000-0000-0000-000000000001';
update public.items set image_url = null where id = '40000000-0000-0000-0000-000000000001';
select is((select count(*) from new_requests), 1::bigint, 'an unchanged or cleared image_url sends nothing');

update public.items set deleted_at = now() where id = '40000000-0000-0000-0000-000000000002';
update public.items set image_url = 'https://cdn.example/deleted.jpg' where id = '40000000-0000-0000-0000-000000000002';
select is((select count(*) from new_requests), 1::bigint, 'a deleted item sends nothing');

-- As the owner, through RLS: allowed to write the column, but it never reaches the server.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000a1","role":"authenticated"}', true);
update public.items set image_url = 'http://169.254.169.254/latest' where id = '40000000-0000-0000-0000-000000000001';
reset role;
select is((select count(*) from new_requests), 1::bigint, 'a client setting image_url sends nothing');

-- After a role switch the claims setting reads '' rather than null; a server write must still go through.
select set_config('request.jwt.claims', '', true);
update public.items set image_url = 'https://cdn.example/after-reset.jpg' where id = '40000000-0000-0000-0000-000000000001';
select is((select count(*) from new_requests), 2::bigint, 'an empty claims setting counts as the server');

select ok(
  not has_function_privilege('authenticated', 'public.post_item_to_function(text, uuid)', 'execute'),
  'clients cannot call the sender');

select * from finish();
rollback;
