import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import type { ItemsRepository } from '../db/itemsRepository.ts';
import type { OutboxRepository } from '../db/outboxRepository.ts';
import type { Item } from '../db/schema.ts';
import type { ThumbStore } from '../thumbs/thumbStore.ts';
import { toCardModel, type CardModel } from '../grid/cardModel.ts';
import { toItemRow, type ItemRow } from './itemRow.ts';

/** SPEC §5 "Recently saved": the latest 12 items by created_at. */
export const RECENT_LIMIT = 12;
export const INBOX_TITLE = 'Inbox';

export interface CollectionRow {
  readonly id: string;
  readonly name: string;
  readonly count: number;
}

/** Home's shape (SPEC #16) without Rediscover, which Phase 2 adds. */
export interface HomeLists {
  readonly recent: readonly ItemRow[];
  readonly inboxCount: number;
  readonly collections: readonly CollectionRow[];
}

export type Place = { readonly kind: 'inbox' } | { readonly kind: 'collection'; readonly id: string };

export interface PlaceList {
  readonly title: string;
  readonly cards: readonly CardModel[];
}

export interface ListSources {
  readonly items: Pick<ItemsRepository, 'listRecent' | 'listInbox' | 'listInCollection' | 'countByCollection'>;
  readonly collections: Pick<CollectionsRepository, 'list'>;
  readonly outbox: Pick<OutboxRepository, 'list'>;
  readonly thumbs: Pick<ThumbStore, 'fileUris'>;
}

/** A failed entry will never sync (#14 gives those a UI), so only pending ones count as waiting. */
function toRows(sources: ListSources, items: readonly Item[]): readonly ItemRow[] {
  const queued = new Set(sources.outbox.list().filter((entry) => entry.tableName === 'items' && entry.status === 'pending').map((entry) => entry.rowId));
  const thumbs = sources.thumbs.fileUris();
  return items.map((item) => toItemRow(item, { queued: queued.has(item.id), thumbUri: thumbs.get(item.id) ?? null }));
}

export function readHome(sources: ListSources): HomeLists {
  const counts = sources.items.countByCollection();
  return {
    recent: toRows(sources, sources.items.listRecent(RECENT_LIMIT)),
    inboxCount: counts.get(null) ?? 0,
    collections: sources.collections.list().map(({ id, name }) => ({ id, name, count: counts.get(id) ?? 0 })),
  };
}

function toCards(sources: ListSources, items: readonly Item[]): readonly CardModel[] {
  const thumbs = sources.thumbs.fileUris();
  return items.map((item) => toCardModel(item, thumbs.get(item.id) ?? null));
}

/** Null when the collection isn't on the device (deleted elsewhere, or a stale link). */
export function readPlace(sources: ListSources, place: Place): PlaceList | null {
  if (place.kind === 'inbox') return { title: INBOX_TITLE, cards: toCards(sources, sources.items.listInbox()) };
  const collection = sources.collections.list().find(({ id }) => id === place.id);
  if (!collection) return null;
  return { title: collection.name, cards: toCards(sources, sources.items.listInCollection(collection.id)) };
}
