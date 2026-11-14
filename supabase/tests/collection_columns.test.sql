-- Run with: supabase test db
-- #34: collections lost their derived tint and the unused cover pointer (#44); both are decided on the device or not at all.
begin;
create extension if not exists pgtap with schema extensions;
select plan(2);

select hasnt_column('public', 'collections', 'tint', 'collections has no tint');
select hasnt_column('public', 'collections', 'cover_item_id', 'collections has no cover_item_id');

select * from finish();
rollback;
