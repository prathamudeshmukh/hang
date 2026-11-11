import { and, count, desc, eq, isNull, type SQL } from 'drizzle-orm';
import { enqueue } from './outboxRepository.ts';
import { toServerShape } from './rowShape.ts';
import { collections, items, type Item } from './schema.ts';
import type { HangDb, RepositoryDeps } from './types.ts';
import { validSharedTitle, validSourceUrl } from './validation.ts';

export interface NewItem {
  readonly id: string;
  readonly sourceUrl: string;
  readonly sharedTitle?: string;
  readonly collectionId?: string | null;
}

/** The fields a user can change on an item; everything else is the server's enrichment. */
type ItemUserFields = Partial<Pick<Item, 'collectionId' | 'readAt' | 'progress' | 'deletedAt'>>;

const live = isNull(items.deletedAt);

function assertCollectionExists(tx: HangDb, collectionId: string): void {
  const found = tx.select({ id: collections.id }).from(collections)
    .where(and(eq(collections.id, collectionId), isNull(collections.deletedAt))).get();
  if (!found) throw new Error(`collection ${collectionId} not found`);
}

export function createItemsRepository({ db, clock }: RepositoryDeps) {
  const nowIso = () => new Date(clock.now()).toISOString();

  /** Local update and its outbox patch in one transaction; the patch carries only the changed fields. */
  function patch(id: string, changes: ItemUserFields): void {
    db.transaction((tx) => {
      if (changes.collectionId) assertCollectionExists(tx, changes.collectionId);
      const updated = tx.update(items).set(changes).where(and(eq(items.id, id), live)).returning({ id: items.id }).all();
      if (updated.length === 0) throw new Error(`item ${id} not found`);
      enqueue(tx, { tableName: 'items', rowId: id, op: 'patch', payload: toServerShape('items', changes) }, clock);
    });
  }

  function newestFirst(condition: SQL | undefined) {
    // Ids are UUIDv7, so they break same-millisecond ties in time order.
    return db.select().from(items).where(and(live, condition)).orderBy(desc(items.createdAt), desc(items.id));
  }

  function listWhere(condition: SQL | undefined): readonly Item[] {
    return newestFirst(condition).all();
  }

  return {
    /** Writes the shared link locally and queues it, before any network (SPEC §4, "Saving never waits"). */
    save(input: NewItem): Item {
      const created = {
        id: input.id,
        sourceUrl: validSourceUrl(input.sourceUrl),
        sharedTitle: validSharedTitle(input.sharedTitle),
        collectionId: input.collectionId ?? null,
        createdAt: nowIso(),
      };
      return db.transaction((tx) => {
        if (created.collectionId) assertCollectionExists(tx, created.collectionId);
        const [item] = tx.insert(items).values(created).returning().all();
        enqueue(tx, { tableName: 'items', rowId: created.id, op: 'upsert', payload: toServerShape('items', created) }, clock);
        return item;
      });
    },

    /** `null` moves it back to the Inbox. */
    file(id: string, collectionId: string | null): void {
      patch(id, { collectionId });
    },

    markRead(id: string): void {
      patch(id, { readAt: nowIso() });
    },

    remove(id: string): void {
      patch(id, { deletedAt: nowIso() });
    },

    getById(id: string): Item | undefined {
      return db.select().from(items).where(and(eq(items.id, id), live)).get();
    },

    listInbox(): readonly Item[] {
      return listWhere(isNull(items.collectionId));
    },

    listInCollection(collectionId: string): readonly Item[] {
      return listWhere(eq(items.collectionId, collectionId));
    },

    /** Live items per collection id; the Inbox counts under `null`. Collections with no items are absent. */
    countByCollection(): ReadonlyMap<string | null, number> {
      const rows = db.select({ collectionId: items.collectionId, total: count() }).from(items).where(live).groupBy(items.collectionId).all();
      return new Map(rows.map(({ collectionId, total }) => [collectionId, total]));
    },

    listRecent(limit: number): readonly Item[] {
      return newestFirst(undefined).limit(limit).all();
    },
  };
}

export type ItemsRepository = ReturnType<typeof createItemsRepository>;
