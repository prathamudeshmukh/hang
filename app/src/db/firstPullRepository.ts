import { firstPull } from './schema.ts';
import type { RepositoryDeps } from './types.ts';

/** The table holds at most this one row. */
const ONLY_ROW = 1;

/** Whether this account's wall has been pulled onto the device at least once (#75). */
export function createFirstPullRepository({ db, clock }: RepositoryDeps) {
  return {
    hasPulled(): boolean {
      return db.select().from(firstPull).get() !== undefined;
    },

    /** Keeps the first time: later pulls change nothing. */
    markPulled(): void {
      db.insert(firstPull).values({ id: ONLY_ROW, pulledAt: new Date(clock.now()).toISOString() }).onConflictDoNothing().run();
    },
  };
}

export type FirstPullRepository = ReturnType<typeof createFirstPullRepository>;
