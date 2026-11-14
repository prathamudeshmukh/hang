/** Home's words for times, dates and counts (DESIGN.md §9). English only, so no Intl dependency on Hermes. */

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'] as const;
const COUNT_WORDS = ['none', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'] as const;

const MORNING_FROM_HOUR = 5;
const AFTERNOON_FROM_HOUR = 12;
const EVENING_FROM_HOUR = 18;

/** Night counts as evening: "Good night" reads as a goodbye. */
export function greetingFor(now: Date): string {
  const hour = now.getHours();
  if (hour >= MORNING_FROM_HOUR && hour < AFTERNOON_FROM_HOUR) return 'Good morning';
  if (hour >= AFTERNOON_FROM_HOUR && hour < EVENING_FROM_HOUR) return 'Good afternoon';
  return 'Good evening';
}

export function dayLine(now: Date): string {
  return `${WEEKDAYS[now.getDay()]}, ${now.getDate()} ${MONTHS[now.getMonth()]}`;
}

const MONTHS_SHORT = MONTHS.map((month) => month.slice(0, 3));
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

/** A day in words (DESIGN.md §4): "today", "yesterday", "3 Nov", and "24 Dec 2025" once it isn't this year. */
export function dayWords(date: Date, today: Date): string {
  const daysAgo = Math.round((startOfDay(today) - startOfDay(date)) / DAY_MS);
  if (daysAgo === 0) return 'today';
  if (daysAgo === 1) return 'yesterday';
  const day = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
  return date.getFullYear() === today.getFullYear() ? day : `${day} ${date.getFullYear()}`;
}

/** The local calendar date as `YYYY-MM-DD`, the shape of the server's `date` columns. */
export function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** When a Rediscover pick was saved: "from March", with the year once it isn't this one. */
export function savedMonthNote(createdAt: string, today: Date): string | null {
  const saved = new Date(createdAt);
  if (Number.isNaN(saved.getTime())) return null;
  const month = MONTHS[saved.getMonth()];
  return saved.getFullYear() === today.getFullYear() ? `from ${month}` : `from ${month} ${saved.getFullYear()}`;
}

export function countInWords(count: number): string {
  return COUNT_WORDS[count] ?? String(count);
}
