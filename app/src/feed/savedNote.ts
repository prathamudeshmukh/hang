import { DAY_MS, MONTHS, localMidnight } from '../copy/calendar.ts';

const DAYS_PER_WEEK = 7;
/** Below a week, count days; up to this many days, count weeks; past it, name the month (#54). */
const LAST_DAY_COUNTED = 6;
const LAST_DAY_OF_LAST_WEEK = 13;
const LAST_DAY_IN_WEEKS = 34;

/** Calendar days in the device's timezone; rounding absorbs a daylight-saving hour. */
function calendarDaysBetween(earlier: Date, later: Date): number {
  return Math.max(0, Math.round((localMidnight(later) - localMidnight(earlier)) / DAY_MS));
}

function monthWords(saved: Date, now: Date): string {
  const month = MONTHS[saved.getMonth()];
  return saved.getFullYear() === now.getFullYear() ? `in ${month}` : `in ${month} ${saved.getFullYear()}`;
}

function sinceWords(saved: Date, now: Date): string {
  const days = calendarDaysBetween(saved, now);
  if (days === 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days <= LAST_DAY_COUNTED) return `${days} days ago`;
  if (days <= LAST_DAY_OF_LAST_WEEK) return 'last week';
  if (days <= LAST_DAY_IN_WEEKS) return `${Math.floor(days / DAYS_PER_WEEK)} weeks ago`;
  return monthWords(saved, now);
}

/** *saved 3 days ago*: how long a link has hung, for its feed note (#54). Null if the time can't be read. */
export function savedNote(createdAt: string, now: Date): string | null {
  const saved = new Date(createdAt);
  return Number.isNaN(saved.getTime()) ? null : `saved ${sinceWords(saved, now)}`;
}
