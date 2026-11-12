-- One-off (#26): re-runs `extract` on items that were ready before image_url existed, so they get one and the
-- media trigger makes their thumbnails. Derived fields only are rewritten (SPEC §4 step 6); collection and
-- reading state are untouched. Items show "fetching…" for a few seconds while this runs.
--
-- Run in the hosted SQL editor after both functions are deployed and Vault has `media_url`.
-- 1. Set `started` below to the time of your first run (any time after the deploy) and keep it for every run.
--    Each processed row gets a newer updated_at, so items that genuinely have no image aren't picked twice.
-- 2. Run it; batches of 50 keep the burst of third-party fetches small. Run again a minute apart until `sent` is 0.
with params as (
  select timestamptz '2026-11-12 12:00:00+00' as started
),
batch as (
  select i.id from public.items i, params p
   where i.status = 'ready'
     and i.image_url is null
     and i.thumb_path is null
     and i.deleted_at is null
     and i.updated_at < p.started
   order by i.id
   limit 50
),
redo as (
  update public.items set status = 'pending' where id in (select id from batch) returning id
)
select count(*) as sent from redo, lateral public.post_item_to_function('extract_url', redo.id);
