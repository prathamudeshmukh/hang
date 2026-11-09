import { primaryKeyColumn, type ServerRow } from '../db/rowShape.ts';
import { SYNC_TABLE_ORDER, type OutboxEntry, type SyncTableName } from '../db/schema.ts';
import { backoffMs } from './backoff.ts';
import { parseServerRow } from './serverRows.ts';
import { compareCursors, laterCursor, overlapStart, type Cursor } from './cursor.ts';
import { RemoteError, type SyncEngineDeps, type SyncOptions, type SyncReport } from './types.ts';

export const DEFAULT_SYNC_OPTIONS: SyncOptions = {
  pageSize: 200,
  overlapMs: 5000,
  backoff: { baseMs: 2000, maxMs: 5 * 60 * 1000 },
};

type PushOutcome = { readonly kind: 'pushed' } | { readonly kind: 'failed'; readonly count: number } | { readonly kind: 'retry' };

/** Rows are already validated, so the key and updated_at are strings. */
function rowCursor(tableName: SyncTableName, row: ServerRow): Cursor {
  return { updatedAt: String(row.updated_at), id: String(row[primaryKeyColumn(tableName)]) };
}

/** A remote that ignores `after` would hand back the same page forever. */
function advance(tableName: SyncTableName, previous: Cursor | null, next: Cursor): Cursor {
  if (previous && compareCursors(next, previous) <= 0) {
    throw new Error(`Pull of ${tableName} did not advance past ${previous.updatedAt}`);
  }
  return next;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Pull-and-push sync (SPEC §4). Push first, so the pull that follows already reflects local writes.
 * Never two runs at once. A call made during a run gets one follow-up run after it (shared by every
 * call made meanwhile), so a write made mid-run is always pushed by the run its caller awaits.
 */
export function createSyncEngine({ store, remote, clock, options }: SyncEngineDeps) {
  const settings: SyncOptions = { ...DEFAULT_SYNC_OPTIONS, ...options };
  let running: Promise<SyncReport> | null = null;
  let followUp: Promise<SyncReport> | null = null;

  async function pushEntry(entry: OutboxEntry): Promise<PushOutcome> {
    try {
      await remote.push({ tableName: entry.tableName, rowId: entry.rowId, op: entry.op, payload: entry.payload });
      store.complete(entry.seq);
      return { kind: 'pushed' };
    } catch (error) {
      if (error instanceof RemoteError && !error.retryable) {
        return { kind: 'failed', count: store.markFailed(entry, error.message) };
      }
      const nextAttemptAt = clock.now() + backoffMs(entry.attempts + 1, settings.backoff);
      store.retryLater(entry, { error: errorMessage(error), nextAttemptAt });
      return { kind: 'retry' };
    }
  }

  /** Strictly in order: a later entry may depend on an earlier one (an item filed into a new collection). */
  async function push(): Promise<Pick<SyncReport, 'pushed' | 'failed' | 'waiting'>> {
    let counts = { pushed: 0, failed: 0 };
    for (let entry = store.nextPending(); entry; entry = store.nextPending()) {
      if (entry.nextAttemptAt > clock.now()) return { ...counts, waiting: true };
      const outcome = await pushEntry(entry);
      if (outcome.kind === 'retry') return { ...counts, waiting: true };
      counts = outcome.kind === 'pushed'
        ? { ...counts, pushed: counts.pushed + 1 }
        : { ...counts, failed: counts.failed + outcome.count };
    }
    return { ...counts, waiting: false };
  }

  async function pullTable(tableName: SyncTableName): Promise<number> {
    const stored = store.readCursor(tableName);
    let after = stored && overlapStart(stored, settings.overlapMs);
    let kept = stored;
    let applied = 0;
    for (;;) {
      const received = await remote.pull({ tableName, after, limit: settings.pageSize });
      if (received.length === 0) return applied;
      const rows = received.map((row) => parseServerRow(tableName, row));
      after = advance(tableName, after, rowCursor(tableName, rows[rows.length - 1]));
      kept = laterCursor(kept, after);
      store.applyPulled(tableName, { rows, cursor: kept });
      applied += rows.length;
      if (rows.length < settings.pageSize) return applied;
    }
  }

  async function pull(): Promise<SyncReport['pulled']> {
    const pulled: Partial<Record<SyncTableName, number>> = {};
    for (const tableName of SYNC_TABLE_ORDER) {
      pulled[tableName] = await pullTable(tableName);
    }
    return pulled as SyncReport['pulled'];
  }

  function startAfterCurrent(): Promise<SyncReport> {
    followUp = null;
    return engine.sync();
  }

  async function run(): Promise<SyncReport> {
    const pushReport = await push();
    return { ...pushReport, pulled: await pull() };
  }

  const engine = {
    sync(): Promise<SyncReport> {
      if (running) {
        followUp ??= running.then(startAfterCurrent, startAfterCurrent);
        return followUp;
      }
      running = run().finally(() => {
        running = null;
      });
      return running;
    },
  };
  return engine;
}

export type SyncEngine = ReturnType<typeof createSyncEngine>;
