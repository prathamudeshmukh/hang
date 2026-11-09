import { primaryKeyColumn, type ServerRow } from '../../db/rowShape.ts';
import type { SyncTableName } from '../../db/schema.ts';
import { compareCursors, MICROS_PER_MS, type Cursor } from '../cursor.ts';
import { RemoteError, type PullRequest, type PushRequest, type SyncRemote } from '../types.ts';

/**
 * An in-memory server: stamps `updated_at` like the Postgres trigger (strictly increasing
 * microseconds) and answers pulls with the same (updated_at, id) cursor semantics.
 */
export interface FakeRemote extends SyncRemote {
  /** Every push request, including ones that failed. */
  readonly attempts: PushRequest[];
  /** Pushes that succeeded. */
  readonly pushes: PushRequest[];
  readonly pulls: PullRequest[];
  rows(tableName: SyncTableName): readonly ServerRow[];
  /** A server-side write (extraction, another device). */
  write(tableName: SyncTableName, row: ServerRow): ServerRow;
  /** Seed a row with an explicit updated_at, e.g. one that committed late. */
  seed(tableName: SyncTableName, row: ServerRow): void;
  failNextPush(error: Error): void;
}

const BASE_MICROS = Date.parse('2026-11-09T09:00:00Z') * MICROS_PER_MS;

function stamp(micros: number): string {
  const ms = Math.floor(micros / MICROS_PER_MS);
  return new Date(ms).toISOString().replace('Z', `${String(micros % MICROS_PER_MS).padStart(3, '0')}+00:00`);
}

function cursorOf(tableName: SyncTableName, row: ServerRow): Cursor {
  return { updatedAt: String(row.updated_at), id: String(row[primaryKeyColumn(tableName)]) };
}

export function createFakeRemote(): FakeRemote {
  const tables = new Map<SyncTableName, Map<string, ServerRow>>();
  const pushFailures: Error[] = [];
  let tick = 0;
  const pushes: PushRequest[] = [];
  const attempts: PushRequest[] = [];
  const pulls: PullRequest[] = [];

  const table = (name: SyncTableName) => tables.get(name) ?? tables.set(name, new Map()).get(name)!;

  function write(tableName: SyncTableName, row: ServerRow): ServerRow {
    const id = String(row[primaryKeyColumn(tableName)]);
    tick += 1;
    const stored = { ...table(tableName).get(id), ...row, updated_at: stamp(BASE_MICROS + tick) };
    table(tableName).set(id, stored);
    return stored;
  }

  return {
    attempts,
    pushes,
    pulls,
    rows: (tableName) => [...table(tableName).values()],
    write,
    seed: (tableName, row) => {
      table(tableName).set(String(row[primaryKeyColumn(tableName)]), row);
    },
    failNextPush: (error) => {
      pushFailures.push(error);
    },

    async pull(request) {
      pulls.push(request);
      const after = request.after;
      return [...table(request.tableName).values()]
        .filter((row) => !after || compareCursors(cursorOf(request.tableName, row), after) > 0)
        .sort((a, b) => compareCursors(cursorOf(request.tableName, a), cursorOf(request.tableName, b)))
        .slice(0, request.limit);
    },

    async push(request) {
      attempts.push(request);
      const failure = pushFailures.shift();
      if (failure) throw failure;
      const exists = table(request.tableName).has(request.rowId);
      if (request.op === 'patch' && !exists) throw new RemoteError('no such row', { retryable: false });
      write(request.tableName, { [primaryKeyColumn(request.tableName)]: request.rowId, ...request.payload });
      pushes.push(request);
    },
  };
}
