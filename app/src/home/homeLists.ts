import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import type { ItemsRepository } from '../db/itemsRepository.ts';
import type { Item } from '../db/schema.ts';
import type { ThumbStore } from '../thumbs/thumbStore.ts';
import { toCardModel, type CardModel } from '../grid/cardModel.ts';
import { dayKey, savedMonthNote } from './homeCopy.ts';
import { pickRediscover, rediscoverWindow } from './rediscover.ts';

/** SPEC §5 "Recently saved": the latest 12 items by created_at. */
export const RECENT_LIMIT = 12;
export const INBOX_TITLE = 'Inbox';

export interface RecentPrint {
  readonly card: CardModel;
  readonly inInbox: boolean;
}

export interface RediscoverPick {
  readonly card: CardModel;
  /** "from March": when it was saved. */
  readonly savedNote: string | null;
  /** False until Home stamps `rediscovered_on` with today, on first show. */
  readonly stampedToday: boolean;
}

export interface CollectionRow {
  readonly id: string;
  readonly name: string;
  readonly count: number;
  readonly coverUri: string | null;
}

/** Home's shape (SPEC #16): Recently saved (holding the Inbox), one Rediscover pick, collections. */
export interface HomeLists {
  readonly recent: readonly RecentPrint[];
  readonly inboxCount: number;
  readonly rediscover: RediscoverPick | null;
  readonly collections: readonly CollectionRow[];
}

export type Place = { readonly kind: 'inbox' } | { readonly kind: 'collection'; readonly id: string };

export interface PlaceList {
  readonly title: string;
  readonly cards: readonly CardModel[];
}

export interface ListSources {
  readonly items: Pick<ItemsRepository, 'listRecent' | 'listInbox' | 'listInCollection' | 'listRediscoverCandidates' | 'getById' | 'countByCollection'>;
  readonly collections: Pick<CollectionsRepository, 'list'>;
  readonly thumbs: Pick<ThumbStore, 'fileUris' | 'coversByCollection'>;
}

function readRediscover(sources: ListSources, now: Date, thumbs: ReadonlyMap<string, string>): RediscoverPick | null {
  const picked = pickRediscover(sources.items.listRediscoverCandidates(rediscoverWindow(now)), now);
  const item = picked ? sources.items.getById(picked.id) : undefined;
  if (!item) return null;
  return {
    card: toCardModel(item, thumbs.get(item.id) ?? null, now),
    savedNote: savedMonthNote(item.createdAt, now),
    stampedToday: item.rediscoveredOn === dayKey(now),
  };
}

function readCollections(sources: ListSources, counts: ReadonlyMap<string | null, number>): readonly CollectionRow[] {
  const covers = sources.thumbs.coversByCollection();
  return sources.collections.list().map(({ id, name }) => ({ id, name, count: counts.get(id) ?? 0, coverUri: covers.get(id) ?? null }));
}

export function readHome(sources: ListSources, now: Date): HomeLists {
  const counts = sources.items.countByCollection();
  const thumbs = sources.thumbs.fileUris();
  const toPrint = (item: Item): RecentPrint => ({ card: toCardModel(item, thumbs.get(item.id) ?? null, now), inInbox: item.collectionId === null });
  return {
    recent: sources.items.listRecent(RECENT_LIMIT).map(toPrint),
    inboxCount: counts.get(null) ?? 0,
    rediscover: readRediscover(sources, now, thumbs),
    collections: readCollections(sources, counts),
  };
}

function toCards(sources: ListSources, items: readonly Item[], now: Date): readonly CardModel[] {
  const thumbs = sources.thumbs.fileUris();
  return items.map((item) => toCardModel(item, thumbs.get(item.id) ?? null, now));
}

/** Null when the collection isn't on the device (deleted elsewhere, or a stale link). */
export function readPlace(sources: ListSources, place: Place, now: Date): PlaceList | null {
  if (place.kind === 'inbox') return { title: INBOX_TITLE, cards: toCards(sources, sources.items.listInbox(), now) };
  const collection = sources.collections.list().find(({ id }) => id === place.id);
  if (!collection) return null;
  return { title: collection.name, cards: toCards(sources, sources.items.listInCollection(collection.id), now) };
}
