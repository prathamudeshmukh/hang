import type { BaseSQLiteDatabase } from 'drizzle-orm/sqlite-core';

/** Any synchronous Drizzle SQLite database: expo-sqlite on the device, better-sqlite3 in tests. */
export type HangDb = BaseSQLiteDatabase<'sync', unknown>;

export interface Clock {
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

export interface RepositoryDeps {
  readonly db: HangDb;
  readonly clock: Clock;
}
