-- #54: the page's own description (og:description), cleaned and capped by `extract` (extract/description.ts).
-- Extracted fact, like raw_title; AI enrichment writes `summary` and reads this as input (SPEC §6).
alter table public.items
  add column description text check (length(description) <= 500);
