/** English month names and local calendar days, shared by every place that says a date. No Intl on Hermes. */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;

export const DAY_MS = 24 * 60 * 60 * 1000;

export function localMidnight(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}
