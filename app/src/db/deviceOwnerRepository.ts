import { collections, deviceOwner, itemContent, items, outbox, syncState } from './schema.ts';
import type { HangDb, RepositoryDeps } from './types.ts';

/**
 * - `claimed`: nobody owned the device; local rows (shares saved before sign-in) now belong to this user.
 * - `resumed`: the same user signed back in; queued changes still push.
 * - `reset`: a different user signed in; the previous user's data was wiped first.
 */
export type BindOutcome = 'claimed' | 'resumed' | 'reset';

const LOCAL_TABLES = [itemContent, items, collections, outbox, syncState, deviceOwner] as const;

function wipeAll(tx: HangDb): void {
  LOCAL_TABLES.forEach((table) => tx.delete(table).run());
}

function readOwner(db: HangDb): string | null {
  return db.select().from(deviceOwner).get()?.userId ?? null;
}

export function createDeviceOwnerRepository({ db }: Pick<RepositoryDeps, 'db'>) {
  return {
    current: (): string | null => readOwner(db),

    /** Atomic: the data and its owner always change together. */
    bindTo(userId: string): BindOutcome {
      return db.transaction((tx) => {
        const owner = readOwner(tx);
        if (owner === userId) return 'resumed';
        if (owner !== null) wipeAll(tx);
        tx.insert(deviceOwner).values({ userId }).run();
        return owner === null ? 'claimed' : 'reset';
      });
    },

    /** Sign-out: everything local goes, including changes that never reached the server. */
    wipe(): void {
      db.transaction((tx) => wipeAll(tx));
    },
  };
}

export type DeviceOwnerRepository = ReturnType<typeof createDeviceOwnerRepository>;
