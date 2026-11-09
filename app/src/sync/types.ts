import type { ServerRow } from '../db/rowShape.ts';
import type { OutboxEntry, OutboxOp, SyncTableName } from '../db/schema.ts';
import type { RetrySchedule } from '../db/outboxRepository.ts';
import type { Clock } from '../db/types.ts';
import type { BackoffPolicy } from './backoff.ts';
import type { Cursor } from './cursor.ts';

export interface PullRequest {
  readonly tableName: SyncTableName;
  /** Rows strictly after this (updated_at, primary key), or every row when null. */
  readonly after: Cursor | null;
  readonly limit: number;
}

export interface PushRequest {
  readonly tableName: SyncTableName;
  readonly rowId: string;
  readonly op: OutboxOp;
  readonly payload: ServerRow;
}

/**
 * The server, as the engine sees it. The Supabase implementation comes with auth (slice 5/7).
 * `pull` returns rows ordered by (updated_at, primary key), tombstones included.
 * `push` is an idempotent upsert on the primary key (`upsert`) or an update of the given columns (`patch`).
 */
export interface SyncRemote {
  /** Rows as received: the engine validates them (serverRows.ts). */
  pull(request: PullRequest): Promise<readonly unknown[]>;
  push(request: PushRequest): Promise<void>;
}

/** Thrown by a remote. `retryable: false` means sending the same thing again can't succeed. */
export class RemoteError extends Error {
  readonly retryable: boolean;

  constructor(message: string, options: { readonly retryable: boolean; readonly cause?: unknown }) {
    super(message, { cause: options.cause });
    this.name = 'RemoteError';
    this.retryable = options.retryable;
  }
}

/** The local side of sync; implemented over SQLite by `createSqliteSyncStore`. */
export interface SyncStore {
  readCursor(tableName: SyncTableName): Cursor | null;
  /** Applies a page of pulled rows and moves the cursor, atomically. */
  applyPulled(tableName: SyncTableName, page: PulledPage): void;
  nextPending(): OutboxEntry | undefined;
  complete(seq: number): void;
  retryLater(entry: OutboxEntry, schedule: RetrySchedule): void;
  /** Returns how many entries were set aside (a failed create takes the row's later changes with it). */
  markFailed(entry: OutboxEntry, error: string): number;
}

export interface PulledPage {
  readonly rows: readonly ServerRow[];
  readonly cursor: Cursor;
}

export interface SyncOptions {
  readonly pageSize: number;
  readonly overlapMs: number;
  readonly backoff: BackoffPolicy;
}

export interface SyncEngineDeps {
  readonly store: SyncStore;
  readonly remote: SyncRemote;
  readonly clock: Clock;
  readonly options?: Partial<SyncOptions>;
}

export interface SyncReport {
  readonly pushed: number;
  readonly failed: number;
  /** True when entries are still queued, waiting out a backoff. */
  readonly waiting: boolean;
  readonly pulled: Readonly<Record<SyncTableName, number>>;
}
