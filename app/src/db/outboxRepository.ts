import { and, asc, eq, gte } from 'drizzle-orm';
import { outbox, type OutboxEntry, type OutboxOp, type SyncTableName } from './schema.ts';
import type { ServerRow } from './rowShape.ts';
import type { Clock, HangDb, RepositoryDeps } from './types.ts';

export interface NewOutboxEntry {
  readonly tableName: SyncTableName;
  readonly rowId: string;
  readonly op: OutboxOp;
  readonly payload: ServerRow;
}

export interface RetrySchedule {
  readonly error: string;
  readonly nextAttemptAt: number;
}

/** Call inside the same transaction as the local write, so the two can't drift apart. */
export function enqueue(tx: HangDb, entry: NewOutboxEntry, clock: Clock): void {
  tx.insert(outbox)
    .values({ ...entry, payload: { ...entry.payload }, createdAt: new Date(clock.now()).toISOString() })
    .run();
}

export function createOutboxRepository({ db }: RepositoryDeps) {
  const bySeq = (seq: number) => eq(outbox.seq, seq);

  return {
    list(): readonly OutboxEntry[] {
      return db.select().from(outbox).orderBy(asc(outbox.seq)).all();
    },

    /** The oldest entry still to push. Entries are replayed strictly in order. */
    nextPending(): OutboxEntry | undefined {
      return db.select().from(outbox).where(eq(outbox.status, 'pending')).orderBy(asc(outbox.seq)).limit(1).get();
    },

    complete(seq: number): void {
      db.delete(outbox).where(bySeq(seq)).run();
    },

    retryLater(entry: OutboxEntry, schedule: RetrySchedule): void {
      db.update(outbox)
        .set({ attempts: entry.attempts + 1, nextAttemptAt: schedule.nextAttemptAt, lastError: schedule.error })
        .where(bySeq(entry.seq))
        .run();
    },

    /**
     * Sets an entry aside for good. When a row's create failed, the row isn't on the server, so its
     * later changes can't land either: they're set aside with it. Returns how many entries failed.
     */
    markFailed(entry: OutboxEntry, error: string): number {
      const sameRowFromHere = and(
        eq(outbox.tableName, entry.tableName),
        eq(outbox.rowId, entry.rowId),
        eq(outbox.status, 'pending'),
        gte(outbox.seq, entry.seq),
      );
      const scope = entry.op === 'upsert' ? sameRowFromHere : bySeq(entry.seq);
      return db.transaction((tx) => {
        tx.update(outbox).set({ attempts: entry.attempts + 1 }).where(bySeq(entry.seq)).run();
        return tx.update(outbox).set({ status: 'failed', lastError: error }).where(scope).returning({ seq: outbox.seq }).all().length;
      });
    },

    /** Server columns this row still has un-pushed local writes for. */
    pendingColumns(tableName: SyncTableName, rowId: string): ReadonlySet<string> {
      const entries = db
        .select({ payload: outbox.payload })
        .from(outbox)
        .where(and(eq(outbox.tableName, tableName), eq(outbox.rowId, rowId), eq(outbox.status, 'pending')))
        .all();
      return new Set(entries.flatMap((entry) => Object.keys(entry.payload)));
    },
  };
}

export type OutboxRepository = ReturnType<typeof createOutboxRepository>;
