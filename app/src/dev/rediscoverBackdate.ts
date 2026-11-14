import { and, desc, eq, isNull } from 'drizzle-orm';
import { items } from '../db/schema.ts';
import type { HangDb } from '../db/types.ts';

/** Past Rediscover's 30-day thresholds (SPEC §5) with room to spare. */
const BACKDATE_DAYS = 40;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Dev tools only (#34): makes the newest ready item old and unopened on this device, so Rediscover has a pick
 * before the library is a month old. Local only, never queued: the next server change to the row undoes it.
 * Returns the item's id, or null when nothing is ready yet.
 */
export function backdateForRediscover(db: HangDb, now: Date): string | null {
  const newest = db
    .select({ id: items.id })
    .from(items)
    .where(and(isNull(items.deletedAt), eq(items.status, 'ready')))
    .orderBy(desc(items.createdAt), desc(items.id))
    .get();
  if (!newest) return null;
  const longAgo = new Date(now.getTime() - BACKDATE_DAYS * DAY_MS).toISOString();
  db.update(items).set({ createdAt: longAgo, lastOpenedAt: null, rediscoveredOn: null }).where(eq(items.id, newest.id)).run();
  return newest.id;
}
