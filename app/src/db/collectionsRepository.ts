import { asc, isNull, max } from 'drizzle-orm';
import { enqueue } from './outboxRepository.ts';
import { toServerShape } from './rowShape.ts';
import { collections, type Collection } from './schema.ts';
import type { HangDb, RepositoryDeps } from './types.ts';
import { validCollectionName } from './validation.ts';

export interface NewCollection {
  readonly id: string;
  readonly name: string;
}

export type CreatedCollection = Pick<Collection, 'id' | 'name' | 'position' | 'createdAt'>;

const liveCollections = isNull(collections.deletedAt);

/** Client-side only (the server allows duplicates): two chips with one name in the share sheet would be ambiguous. */
const comparable = (name: string) => name.normalize('NFC').toLowerCase();

function assertNameIsFree(tx: HangDb, name: string): void {
  const wanted = comparable(name);
  const taken = tx.select({ name: collections.name }).from(collections).where(liveCollections).all()
    .find((existing) => comparable(existing.name) === wanted);
  if (taken) throw new Error(`You already have “${taken.name}”`);
}

export function createCollectionsRepository({ db, clock }: RepositoryDeps) {
  return {
    /** Adds the collection at the end of Home's list and queues it for the server. */
    create(input: NewCollection): CreatedCollection {
      const name = validCollectionName(input.name);
      return db.transaction((tx) => {
        assertNameIsFree(tx, name);
        const last = tx.select({ position: max(collections.position) }).from(collections).get();
        const created: CreatedCollection = {
          id: input.id,
          name,
          position: (last?.position ?? -1) + 1,
          createdAt: new Date(clock.now()).toISOString(),
        };
        tx.insert(collections).values(created).run();
        enqueue(tx, { tableName: 'collections', rowId: created.id, op: 'upsert', payload: toServerShape('collections', created) }, clock);
        return created;
      });
    },

    list(): readonly Collection[] {
      return db.select().from(collections).where(liveCollections).orderBy(asc(collections.position)).all();
    },
  };
}

export type CollectionsRepository = ReturnType<typeof createCollectionsRepository>;
