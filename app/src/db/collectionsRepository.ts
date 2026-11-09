import { asc, isNull, max } from 'drizzle-orm';
import { enqueue } from './outboxRepository.ts';
import { toServerShape } from './rowShape.ts';
import { collections, type Collection } from './schema.ts';
import type { RepositoryDeps } from './types.ts';
import { validCollectionName } from './validation.ts';

export interface NewCollection {
  readonly id: string;
  readonly name: string;
}

export type CreatedCollection = Pick<Collection, 'id' | 'name' | 'position' | 'createdAt'>;

export function createCollectionsRepository({ db, clock }: RepositoryDeps) {
  return {
    /** Adds the collection at the end of Home's list and queues it for the server. */
    create(input: NewCollection): CreatedCollection {
      const name = validCollectionName(input.name);
      return db.transaction((tx) => {
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
      return db.select().from(collections).where(isNull(collections.deletedAt)).orderBy(asc(collections.position)).all();
    },
  };
}

export type CollectionsRepository = ReturnType<typeof createCollectionsRepository>;
