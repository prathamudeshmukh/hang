/**
 * Pull cursors are the (updated_at, primary key) of the last row applied. Postgres timestamps carry
 * microseconds, which a JS Date drops, so comparisons work on whole microseconds since the epoch.
 */
export interface Cursor {
  readonly updatedAt: string;
  readonly id: string;
}

/** The smallest uuid: "every row at this timestamp". */
export const NIL_ID = '00000000-0000-0000-0000-000000000000';

const SERVER_TIMESTAMP = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::?\d{2})?)$/;
export const MICROS_PER_MS = 1000;
const FRACTION_DIGITS = 6;

function isoOffset(offset: string): string {
  if (offset === 'Z') return offset;
  const digits = offset.slice(1).replace(':', '').padEnd(4, '0');
  return `${offset[0]}${digits.slice(0, 2)}:${digits.slice(2)}`;
}

export function serverTimestampMicros(timestamp: string): number {
  const match = SERVER_TIMESTAMP.exec(timestamp);
  if (!match) throw new Error(`Not a server timestamp: ${timestamp}`);
  const [, date, time, fraction = '', offset] = match;
  const wholeSeconds = Date.parse(`${date}T${time}${isoOffset(offset)}`);
  return wholeSeconds * MICROS_PER_MS + Number(fraction.padEnd(FRACTION_DIGITS, '0'));
}

function microsToIso(micros: number): string {
  const ms = Math.floor(micros / MICROS_PER_MS);
  const extraMicros = String(micros - ms * MICROS_PER_MS).padStart(3, '0');
  return new Date(ms).toISOString().replace('Z', `${extraMicros}Z`);
}

export function compareCursors(a: Cursor, b: Cursor): number {
  const byTime = serverTimestampMicros(a.updatedAt) - serverTimestampMicros(b.updatedAt);
  if (byTime !== 0) return byTime;
  if (a.id === b.id) return 0;
  return a.id < b.id ? -1 : 1;
}

export function laterCursor(a: Cursor | null, b: Cursor): Cursor {
  return a && compareCursors(a, b) > 0 ? a : b;
}

/**
 * Where a pull starts. `updated_at` is stamped before commit, so a slow transaction can commit a row
 * older than one already pulled; re-reading a short window catches it. Re-applying a row is harmless.
 * Limit: a transaction that takes longer than the window to commit can still be missed until that row
 * changes again. Our writes are single-row and short, so the window is generous.
 */
export function overlapStart(cursor: Cursor, overlapMs: number): Cursor {
  const micros = serverTimestampMicros(cursor.updatedAt) - overlapMs * MICROS_PER_MS;
  return { updatedAt: microsToIso(micros), id: NIL_ID };
}
