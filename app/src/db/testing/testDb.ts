import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import type { Clock, HangDb, RepositoryDeps } from '../types.ts';

const MIGRATIONS_FOLDER = path.join(import.meta.dirname, '..', 'migrations');

/** A fresh in-memory database with the real migrations applied. Node-only: never import from app code. */
export function createTestDb(): HangDb {
  const db = drizzle(new Database(':memory:'));
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}

export interface FakeClock extends Clock {
  advance(ms: number): void;
}

export const T0 = Date.parse('2026-11-09T10:00:00.000Z');

export function createFakeClock(start = T0): FakeClock {
  let current = start;
  return {
    now: () => current,
    advance: (ms) => {
      current += ms;
    },
  };
}

export function createTestDeps(): RepositoryDeps & { readonly clock: FakeClock } {
  return { db: createTestDb(), clock: createFakeClock() };
}
