import type { Item } from '../db/schema.ts';
import { dayKey } from './homeCopy.ts';

/** SPEC §5 Rediscover. */
const SAVED_AT_LEAST_DAYS = 30;
const UNOPENED_FOR_DAYS = 30;
const NOT_REDISCOVERED_FOR_DAYS = 60;

const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

export type RediscoverFields = Pick<Item, 'id' | 'createdAt' | 'lastOpenedAt' | 'rediscoveredOn' | 'readAt'>;

/** Today's limits: instants as ISO strings, days as local `YYYY-MM-DD`. */
export interface RediscoverWindow {
  readonly savedBefore: string;
  readonly openedBefore: string;
  readonly rediscoveredBefore: string;
  readonly today: string;
}

/** Calendar days, not 24-hour blocks, so a daylight-saving change never moves the line. */
function daysBefore(now: Date, days: number): Date {
  const shifted = new Date(now);
  shifted.setDate(now.getDate() - days);
  return shifted;
}

export function rediscoverWindow(now: Date): RediscoverWindow {
  return {
    savedBefore: daysBefore(now, SAVED_AT_LEAST_DAYS).toISOString(),
    openedBefore: daysBefore(now, UNOPENED_FOR_DAYS).toISOString(),
    rediscoveredBefore: dayKey(daysBefore(now, NOT_REDISCOVERED_FOR_DAYS)),
    today: dayKey(now),
  };
}

/** FNV-1a: a stable, well-spread order that changes with the day. */
function dailyRank(day: string, id: string): number {
  let hash = FNV_OFFSET;
  for (const char of `${day}:${id}`) {
    hash = Math.imul(hash ^ char.charCodeAt(0), FNV_PRIME) >>> 0;
  }
  return hash;
}

/** Server rows say `+00:00` with microseconds, local ones `Z`: compare instants, not text. */
const isBefore = (timestamp: string, limit: string) => Date.parse(timestamp) < Date.parse(limit);

function qualifies(item: RediscoverFields, window: RediscoverWindow): boolean {
  return (
    isBefore(item.createdAt, window.savedBefore) &&
    (item.lastOpenedAt === null || isBefore(item.lastOpenedAt, window.openedBefore)) &&
    (item.rediscoveredOn === null || item.rediscoveredOn < window.rediscoveredBefore)
  );
}

function lowestRank<T extends RediscoverFields>(items: readonly T[], day: string): T | null {
  return items.reduce<T | null>((best, item) => (best === null || dailyRank(day, item.id) < dailyRank(day, best.id) ? item : best), null);
}

/**
 * Today's one pick. Once stamped (`rediscovered_on` = today) it holds for the rest of the day, even
 * after it's opened or another item ages into the pool. Unread items go first.
 */
export function pickRediscover<T extends RediscoverFields>(items: readonly T[], now: Date): T | null {
  const window = rediscoverWindow(now);
  const stamped = items.filter((item) => item.rediscoveredOn === window.today);
  if (stamped.length > 0) return lowestRank(stamped, window.today);
  const pool = items.filter((item) => qualifies(item, window));
  const unread = pool.filter((item) => item.readAt === null);
  return lowestRank(unread.length > 0 ? unread : pool, window.today);
}
