-- #34: no derived collection tint (DESIGN.md §3, decided 2026-11-14). #44: Home derives covers on the device,
-- so the server-side pointer never had a job. Clients pull with `select *` and never push either column.
alter table public.collections
  drop column tint,
  drop column cover_item_id;
