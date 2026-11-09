import { drizzle } from 'drizzle-orm/expo-sqlite';
import { migrate } from 'drizzle-orm/expo-sqlite/migrator';
import { openDatabaseSync } from 'expo-sqlite';
import migrations from './migrations/migrations';
import type { HangDb } from './types';

const DATABASE_NAME = 'hang.db';

/**
 * One connection per process. The app and the share sheet are two React roots on the same JS runtime
 * (plugins/withShareActivity.js), so they share it.
 */
const expoDb = drizzle(openDatabaseSync(DATABASE_NAME, { enableChangeListener: true }));
export const db: HangDb = expoDb;

let migrated: Promise<void> | null = null;

/** Runs pending migrations once per process; every root awaits the same run. */
export function ensureMigrated(): Promise<void> {
  migrated ??= migrate(expoDb, migrations).catch((error: unknown) => {
    migrated = null;
    throw error;
  });
  return migrated;
}
