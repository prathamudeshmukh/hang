-- Run with: supabase test db
-- #54: items keep the page's own description, written by extract and shown in the feed until AI writes summary.
begin;
create extension if not exists pgtap with schema extensions;
select plan(3);

select has_column('public', 'items', 'description', 'items has a description');
select col_type_is('public', 'items', 'description', 'text', 'description is text');
select col_has_check('public', 'items', 'description', 'description is length-checked');

select * from finish();
rollback;
