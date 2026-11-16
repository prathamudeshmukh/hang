import { DAY_MS, MONTHS, localMidnight } from './calendar.ts';

const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));

/** A day in words (DESIGN.md §4): "today", "yesterday", "3 Nov", and "24 Dec 2025" once it isn't this year. */
export function dayWords(date: Date, today: Date): string {
  const daysAgo = Math.round((localMidnight(today) - localMidnight(date)) / DAY_MS);
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  const day = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}
