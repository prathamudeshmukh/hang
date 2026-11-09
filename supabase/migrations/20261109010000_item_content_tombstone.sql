-- Soft-deleting an item tombstones its reader content too, so clients pulling item_content
-- learn about the delete from that table alone (app/src/sync: tombstones purge local rows).
create function public.tombstone_item_content() returns trigger
language plpgsql as $$
begin
  update public.item_content
     set deleted_at = new.deleted_at
   where item_id = new.id and deleted_at is null;
  return new;
end;
$$;

create trigger items_tombstone_content after update of deleted_at on public.items
  for each row when (old.deleted_at is null and new.deleted_at is not null)
  execute function public.tombstone_item_content();
