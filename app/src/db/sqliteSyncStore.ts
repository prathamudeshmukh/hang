import { eq, getTableColumns } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { mergePulledRow } from '../sync/merge.ts';
import type { Cursor } from '../sync/cursor.ts';
import type { PulledPage, SyncStore } from '../sync/types.ts';
import { createOutboxRepository, type OutboxRepository } from './outboxRepository.ts';
import { fromServerRow, primaryKeyColumn, toLocalFields, type ServerRow } from './rowShape.ts';
import { itemContent, SYNC_TABLES, syncState, type SyncTableName } from './schema.ts';
import type { HangDb, RepositoryDeps } from './types.ts';

type AnyValues = Record<string, unknown>;

function primaryKey(table: SQLiteTable): SQLiteColumn {
  const column = Object.values(getTableColumns(table)).find((candidate) => candidate.primary);
  if (!column) throw new Error('table has no primary key');
  return column;
}

interface ApplyContext {
  readonly tx: HangDb;
  readonly tableName: SyncTableName;
  readonly outbox: OutboxRepository;
}

/** An item's reader content goes with it (the server also tombstones it; this covers older rows). */
function purge({ tx, tableName }: ApplyContext, id: string): void {
  const table = SYNC_TABLES[tableName];
  tx.delete(table).where(eq(primaryKey(table), id)).run();
  if (tableName === 'items') tx.delete(itemContent).where(eq(itemContent.itemId, id)).run();
}

function applyRow(context: ApplyContext, row: ServerRow): void {
  const { tx, tableName, outbox } = context;
  const id = String(row[primaryKeyColumn(tableName)]);
  const pending = outbox.pendingColumns(tableName, id);
  const decision = mergePulledRow(fromServerRow(tableName, row), toLocalFields(tableName, pending));
  if (decision.kind === 'purge') {
    purge(context, id);
    return;
  }
  const table = SYNC_TABLES[tableName];
  // Drizzle can't type a table chosen at runtime; the values come from that table's own columns.
  tx.insert(table)
    .values(decision.insert as AnyValues as never)
    .onConflictDoUpdate({ target: primaryKey(table), set: decision.update as AnyValues })
    .run();
}

function writeCursor(tx: HangDb, tableName: SyncTableName, cursor: Cursor): void {
  const values = { cursorUpdatedAt: cursor.updatedAt, cursorId: cursor.id };
  tx.insert(syncState).values({ tableName, ...values }).onConflictDoUpdate({ target: syncState.tableName, set: values }).run();
}

export function createSqliteSyncStore(deps: RepositoryDeps): SyncStore {
  const { db } = deps;
  const outboxRepository = createOutboxRepository(deps);

  return {
    readCursor(tableName) {
      const state = db.select().from(syncState).where(eq(syncState.tableName, tableName)).get();
      return state ? { updatedAt: state.cursorUpdatedAt, id: state.cursorId } : null;
    },

    applyPulled(tableName, page: PulledPage) {
      db.transaction((tx) => {
        const context: ApplyContext = { tx, tableName, outbox: createOutboxRepository({ ...deps, db: tx }) };
        page.rows.forEach((row) => applyRow(context, row));
        writeCursor(tx, tableName, page.cursor);
      });
    },

    nextPending: outboxRepository.nextPending,
    complete: outboxRepository.complete,
    retryLater: outboxRepository.retryLater,
    markFailed: outboxRepository.markFailed,
  };
}
