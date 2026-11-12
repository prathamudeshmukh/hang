/** DESIGN.md §4 "Catalogue notes: format": lowercase parts joined by a middle dot. */
const SEPARATOR = ' · ';
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;

export function minutesNote(minutes: number | null): string | null {
  return minutes !== null && minutes > 0 ? `${minutes} min` : null;
}

/** Rounds up: a 13 min 1 s video is "14 min". An hour and over is "1 h 20". */
export function durationNote(seconds: number | null): string | null {
  if (seconds === null || seconds <= 0) return null;
  const minutes = Math.ceil(seconds / SECONDS_PER_MINUTE);
  if (minutes < MINUTES_PER_HOUR) return minutesNote(minutes);
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest === 0 ? `${hours} h` : `${hours} h ${String(rest).padStart(2, '0')}`;
}

export function joinNote(parts: readonly (string | null)[]): string {
  return parts.filter((part) => part !== null).join(SEPARATOR);
}

export function thingsCount(count: number): string {
  return count === 1 ? '1 thing' : `${count} things`;
}
