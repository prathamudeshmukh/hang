-- Run with: supabase test db
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

insert into auth.users (id, email) values ('00000000-0000-0000-0000-00000000000a', 'a@test.local');
insert into public.items (id, user_id, source_url) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'https://a.example/'),
  ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'https://c.example/');
insert into public.item_content (item_id, user_id, text) values
  ('20000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'gone soon'),
  ('20000000-0000-0000-0000-00000000000c', '00000000-0000-0000-0000-00000000000a', 'stays');

-- Act as the owner, as the app does.
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}', true);
update public.items set deleted_at = now() where id = '20000000-0000-0000-0000-00000000000a';

select isnt(
  (select deleted_at from public.item_content where item_id = '20000000-0000-0000-0000-00000000000a'),
  null, 'soft-deleting an item tombstones its content');
select is(
  (select deleted_at from public.item_content where item_id = '20000000-0000-0000-0000-00000000000c'),
  null, 'other content is untouched');

select * from finish();
rollback;
