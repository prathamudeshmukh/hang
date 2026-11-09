-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);

-- Arrange: two users, each with one collection and one item.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@test.local'),
  ('00000000-0000-0000-0000-00000000000b', 'b@test.local');

insert into public.collections (id, user_id, name) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'A room'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'B room');
insert into public.items (id, user_id, source_url) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'https://a.example/'),
  ('20000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'https://b.example/');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);

select results_eq('select count(*)::int from public.items', array[1], 'A sees only own items');
select results_eq('select count(*)::int from public.collections', array[1], 'A sees only own collections');

select is_empty(
  $$ update public.items set title = 'x' where id = '20000000-0000-0000-0000-00000000000b' returning id $$,
  'A cannot update B''s item');

select throws_ok(
  $$ insert into public.items (id, user_id, source_url)
     values ('20000000-0000-0000-0000-0000000000a2', '00000000-0000-0000-0000-00000000000b', 'https://x.example/') $$,
  '42501', null, 'A cannot insert an item owned by B');

select lives_ok(
  $$ insert into public.items (id, source_url) values ('20000000-0000-0000-0000-0000000000a3', 'https://ok.example/') $$,
  'A can insert own item; user_id defaults to auth.uid()');

select throws_ok(
  $$ update public.items set collection_id = '10000000-0000-0000-0000-00000000000b'
     where id = '20000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'A cannot file an item into B''s collection');

select throws_ok(
  $$ delete from public.items where id = '20000000-0000-0000-0000-00000000000a' $$,
  '42501', null, 'clients cannot hard-delete');

select throws_ok(
  $$ insert into public.items (id, source_url) values ('20000000-0000-0000-0000-0000000000a4', 'javascript:alert(1)') $$,
  '23514', null, 'only http(s) source urls');

-- updated_at is server-set even if the client sends one.
update public.items set updated_at = '2000-01-01', title = 't' where id = '20000000-0000-0000-0000-00000000000a';
select ok(
  (select updated_at > now() - interval '1 minute' from public.items where id = '20000000-0000-0000-0000-00000000000a'),
  'updated_at ignores the client value');

-- Storage
select lives_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('media', '00000000-0000-0000-0000-00000000000a/uploads/x.jpg', '00000000-0000-0000-0000-00000000000a') $$,
  'A can write in own folder');
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner_id) values ('media', '00000000-0000-0000-0000-00000000000b/uploads/x.jpg', '00000000-0000-0000-0000-00000000000a') $$,
  '42501', null, 'A cannot write in B''s folder');

-- Anonymous sees nothing.
set local role anon;
select throws_ok('select count(*) from public.items', '42501', null, 'anon has no access');

select * from finish();
rollback;
