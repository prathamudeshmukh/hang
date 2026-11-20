import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import type { FirstPullRepository } from '../db/firstPullRepository.ts';
import type { ItemsRepository } from '../db/itemsRepository.ts';
import type { Item } from '../db/schema.ts';
import type { RoomColours } from '../rooms/roomColours.ts';
import type { RoomColourStore } from '../rooms/roomColourStore.ts';
import { roomOf } from '../rooms/roomOf.ts';
import type { ThumbStore } from '../thumbs/thumbStore.ts';
import type { CardModel } from '../grid/cardModel.ts';
import { listCard, type CardContext } from '../grid/listCard.ts';
import { dayKey, savedMonthNote } from './homeCopy.ts';
import { wallState, type WallState } from './homeWall.ts';
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
  /** The room's colour (#85): the cover's frame, and the cover itself when it has no picture. */
  readonly colours: RoomColours;
}

/** Home's shape (SPEC #16): the feature wall's state, Recently saved (holding the Inbox), one Rediscover pick, collections. */
export interface HomeLists {
  readonly wall: WallState;
  readonly recent: readonly RecentPrint[];
  readonly inboxCount: number;
  readonly rediscover: RediscoverPick | null;
  readonly collections: readonly CollectionRow[];
}

export type Place = { readonly kind: 'inbox' } | { readonly kind: 'collection'; readonly id: string };

export interface PlaceList {
  readonly title: string;
  readonly cards: readonly CardModel[];
  /** A collection's colour for its painted header (#85); null for the Inbox. */
  readonly room: RoomColours | null;
}

export interface ListSources {
  readonly items: Pick<ItemsRepository, 'listRecent' | 'listInbox' | 'listInCollection' | 'listRediscoverCandidates' | 'getById' | 'countByCollection'>;
  readonly collections: Pick<CollectionsRepository, 'list'>;
  readonly thumbs: Pick<ThumbStore, 'fileUris' | 'coversByCollection'>;
  readonly firstPulls: Pick<FirstPullRepository, 'hasPulled'>;
  readonly rooms: Pick<RoomColourStore, 'all'>;
}

function cardContext(sources: ListSources, now: Date): CardContext {
  return { thumbs: sources.thumbs.fileUris(), rooms: sources.rooms.all(), now };
}

/** When Home is read, and whether this session's last sync failed (it lives in memory, not the database). */
export interface HomeMoment {
  readonly now: Date;
  readonly syncFailed: boolean;
}

function readRediscover(sources: ListSources, context: CardContext): RediscoverPick | null {
  const { now } = context;
  const picked = pickRediscover(sources.items.listRediscoverCandidates(rediscoverWindow(now)), now);
  const item = picked ? sources.items.getById(picked.id) : undefined;
  if (!item) return null;
  return {
    card: listCard(item, context),
    savedNote: savedMonthNote(item.createdAt, now),
    stampedToday: item.rediscoveredOn === dayKey(now),
  };
}

function readCollections(sources: ListSources, counts: ReadonlyMap<string | null, number>, rooms: ReadonlyMap<string, RoomColours>): readonly CollectionRow[] {
  const covers = sources.thumbs.coversByCollection();
  return sources.collections
    .list()
    .map(({ id, name }) => ({ id, name, count: counts.get(id) ?? 0, coverUri: covers.get(id) ?? null, colours: roomOf(rooms, id) }));
}

export function readHome(sources: ListSources, { now, syncFailed }: HomeMoment): HomeLists {
  const counts = sources.items.countByCollection();
  const context = cardContext(sources, now);
  const toPrint = (item: Item): RecentPrint => ({ card: listCard(item, context), inInbox: item.collectionId === null });
  const recent = sources.items.listRecent(RECENT_LIMIT).map(toPrint);
  return {
    wall: wallState({ hasItems: recent.length > 0, hasPulled: sources.firstPulls.hasPulled(), syncFailed }),
    recent,
    inboxCount: counts.get(null) ?? 0,
    rediscover: readRediscover(sources, context),
    collections: readCollections(sources, counts, context.rooms),
  };
}

function toCards(sources: ListSources, items: readonly Item[], now: Date): readonly CardModel[] {
  const context = cardContext(sources, now);
  return items.map((item) => listCard(item, context));
}

/** Null when the collection isn't on the device (deleted elsewhere, or a stale link). */
export function readPlace(sources: ListSources, place: Place, now: Date): PlaceList | null {
  if (place.kind === 'inbox') return { title: INBOX_TITLE, cards: toCards(sources, sources.items.listInbox(), now), room: null };
  const collection = sources.collections.list().find(({ id }) => id === place.id);
  if (!collection) return null;
  const cards = toCards(sources, sources.items.listInCollection(collection.id), now);
  return { title: collection.name, cards, room: roomOf(sources.rooms.all(), collection.id) };
}
