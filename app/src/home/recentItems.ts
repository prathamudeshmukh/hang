import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import type { ItemsRepository } from '../db/itemsRepository.ts';
import type { OutboxRepository } from '../db/outboxRepository.ts';
import type { ItemStatus } from '../db/schema.ts';

const RECENT_LIMIT = 50;
const INBOX = 'Inbox';

export interface RecentItemRow {
  readonly id: string;
  readonly title: string;
  readonly url: string;
  /** The collection's name, or "Inbox". */
  readonly place: string;
  readonly status: ItemStatus;
  /** Still has outbox entries, so the server may not have it yet. */
  readonly queued: boolean;
}

export interface RecentItemsSources {
  readonly items: Pick<ItemsRepository, 'listRecent'>;
  readonly collections: Pick<CollectionsRepository, 'list'>;
  readonly outbox: Pick<OutboxRepository, 'list'>;
}

/** The Phase 1 home list: just enough to see that shares land locally and sync (slice 7 replaces it). */
export function listRecentItems({ items, collections, outbox }: RecentItemsSources): readonly RecentItemRow[] {
  const names = new Map(collections.list().map(({ id, name }) => [id, name]));
  const queuedIds = new Set(outbox.list().filter((entry) => entry.tableName === 'items').map((entry) => entry.rowId));
  return items.listRecent(RECENT_LIMIT).map((item) => ({
    id: item.id,
    title: item.title ?? item.sharedTitle ?? item.sourceUrl,
    url: item.sourceUrl,
    place: (item.collectionId && names.get(item.collectionId)) || INBOX,
    status: item.status,
    queued: queuedIds.has(item.id),
  }));
}
