import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/**
 * Local mirror of the server tables (supabase/migrations, SPEC §5), plus `outbox`, `sync_state` and
 * `device_owner`.
 *
 * Timestamps are kept as the server's ISO strings, untouched, so a pull cursor is compared exactly as
 * Postgres wrote it (microseconds included). `updated_at` is null on rows that haven't synced yet.
 * `user_id` isn't mirrored: everything on the device belongs to the user in `device_owner`.
 */

export interface Palette {
  readonly dominant: string;
  readonly muted: string;
  readonly onDominant: string;
}

export type ItemKind = 'article' | 'video' | 'post' | 'image' | 'link';
export type ItemStatus = 'pending' | 'extracting' | 'ready' | 'failed';

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  position: integer('position').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
});

export const items = sqliteTable(
  'items',
  {
    id: text('id').primaryKey(),
    collectionId: text('collection_id'),
    sourceUrl: text('source_url').notNull(),
    sharedTitle: text('shared_title'),
    canonicalUrl: text('canonical_url'),
    kind: text('kind').$type<ItemKind>(),
    adapter: text('adapter'),
    status: text('status').$type<ItemStatus>().notNull().default('pending'),
    extractError: text('extract_error'),

    title: text('title'),
    rawTitle: text('raw_title'),
    summary: text('summary'),
    tags: text('tags', { mode: 'json' }).$type<readonly string[]>(),
    siteName: text('site_name'),
    author: text('author'),
    publishedAt: text('published_at'),
    durationS: integer('duration_s'),
    readingMin: integer('reading_min'),
    /** The lead image the server will make a thumbnail from; cleared when it proves unusable (#34). */
    imageUrl: text('image_url'),
    thumbPath: text('thumb_path'),
    thumbW: integer('thumb_w'),
    thumbH: integer('thumb_h'),
    palette: text('palette', { mode: 'json' }).$type<Palette>(),
    post: text('post', { mode: 'json' }).$type<Record<string, unknown>>(),
    embed: text('embed', { mode: 'json' }).$type<Record<string, unknown>>(),

    aiCollectionId: text('ai_collection_id'),
    aiConfidence: real('ai_confidence'),

    readAt: text('read_at'),
    progress: real('progress'),
    lastOpenedAt: text('last_opened_at'),
    rediscoveredOn: text('rediscovered_on'),

    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at'),
    deletedAt: text('deleted_at'),
  },
  (table) => [
    index('items_collection_created').on(table.collectionId, table.createdAt),
    index('items_created').on(table.createdAt),
  ],
);

export const itemContent = sqliteTable('item_content', {
  itemId: text('item_id').primaryKey(),
  html: text('html'),
  text: text('text'),
  wordCount: integer('word_count'),
  updatedAt: text('updated_at'),
  deletedAt: text('deleted_at'),
});

export type OutboxOp = 'upsert' | 'patch';
export type OutboxStatus = 'pending' | 'failed';

/**
 * Local writes waiting to reach the server, replayed in `seq` order. `payload` is already in the
 * server's shape (snake_case columns), so a push sends it as-is. A `failed` entry hit a permanent
 * error (e.g. a check constraint) and is kept only for diagnosis.
 */
export const outbox = sqliteTable(
  'outbox',
  {
    seq: integer('seq').primaryKey({ autoIncrement: true }),
    tableName: text('table_name').$type<SyncTableName>().notNull(),
    rowId: text('row_id').notNull(),
    op: text('op').$type<OutboxOp>().notNull(),
    payload: text('payload', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
    status: text('status').$type<OutboxStatus>().notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    nextAttemptAt: integer('next_attempt_at').notNull().default(0),
    lastError: text('last_error'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('outbox_row').on(table.tableName, table.rowId)],
);

/** One pull cursor per table: the (updated_at, id) of the last row applied. */
export const syncState = sqliteTable('sync_state', {
  tableName: text('table_name').$type<SyncTableName>().primaryKey(),
  cursorUpdatedAt: text('cursor_updated_at').notNull(),
  cursorId: text('cursor_id').notNull(),
});

/**
 * Whose data is on the device: at most one row. No row means nobody has signed in yet, and whatever
 * was shared meanwhile is unclaimed; the first sign-in claims it.
 */
export const deviceOwner = sqliteTable('device_owner', {
  userId: text('user_id').primaryKey(),
});

/**
 * Local only, never synced: the thumbnail files this device has downloaded (SPEC §4, #27). A row means the file
 * at `file_uri` holds that item's thumbnail; it's written once and never re-checked.
 */
export const thumbFiles = sqliteTable('thumb_files', {
  itemId: text('item_id').primaryKey(),
  fileUri: text('file_uri').notNull(),
});

export const SYNC_TABLES = { collections, items, item_content: itemContent } as const;
export type SyncTableName = keyof typeof SYNC_TABLES;

/** Pull order matters: an item's collection should land before the item. */
export const SYNC_TABLE_ORDER: readonly SyncTableName[] = ['collections', 'items', 'item_content'];

export type Collection = typeof collections.$inferSelect;
export type Item = typeof items.$inferSelect;
export type ItemContent = typeof itemContent.$inferSelect;
export type OutboxEntry = typeof outbox.$inferSelect;
export type ThumbFile = typeof thumbFiles.$inferSelect;
