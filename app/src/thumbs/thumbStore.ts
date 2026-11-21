import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or, sql } from 'drizzle-orm';
import { items, thumbFiles, type ThumbFile } from '../db/schema.ts';
import type { HangDb } from '../db/types.ts';

export interface MissingThumb {
  readonly itemId: string;
  readonly thumbPath: string;
}

/** Which items need a thumbnail file, and which files no longer have a live item (SPEC §4, #27). */
export interface ThumbStore {
  /** Ready, live items with a server thumbnail and no local file, newest first. */
  missing(): readonly MissingThumb[];
  record(itemId: string, fileUri: string): void;
  /** Recorded files whose item is tombstoned or gone. */
  stale(): readonly ThumbFile[];
  forget(itemIds: readonly string[]): void;
  all(): readonly ThumbFile[];
  /** Live items' files, for the lists. */
  fileUris(): ReadonlyMap<string, string>;
  /** Each collection's newest live items that have a file, newest first, at most `limit`: its tile on Home (#106). */
  picturesByCollection(limit: number): ReadonlyMap<string, readonly string[]>;
}

interface CollectionFile {
  readonly collectionId: string | null;
  readonly fileUri: string;
}

/** Rows come newest first within each collection. */
function groupNewest(rows: readonly CollectionFile[]): ReadonlyMap<string, readonly string[]> {
  return rows.reduce((groups, { collectionId, fileUri }) =>
    collectionId ? groups.set(collectionId, [...(groups.get(collectionId) ?? []), fileUri]) : groups, new Map<string, readonly string[]>());
}

export function createThumbStore(db: HangDb): ThumbStore {
  return {
    missing: () =>
      db.select({ itemId: items.id, thumbPath: items.thumbPath })
        .from(items)
        .leftJoin(thumbFiles, eq(thumbFiles.itemId, items.id))
        .where(and(eq(items.status, 'ready'), isNull(items.deletedAt), isNotNull(items.thumbPath), isNull(thumbFiles.itemId)))
        .orderBy(desc(items.createdAt))
        .all()
        .flatMap(({ itemId, thumbPath }) => (thumbPath ? [{ itemId, thumbPath }] : [])),
    record: (itemId, fileUri) => {
      db.insert(thumbFiles).values({ itemId, fileUri }).onConflictDoUpdate({ target: thumbFiles.itemId, set: { fileUri } }).run();
    },
    stale: () =>
      db.select({ itemId: thumbFiles.itemId, fileUri: thumbFiles.fileUri })
        .from(thumbFiles)
        .leftJoin(items, eq(items.id, thumbFiles.itemId))
        .where(or(isNull(items.id), isNotNull(items.deletedAt)))
        .all(),
    forget: (itemIds) => {
      if (itemIds.length > 0) db.delete(thumbFiles).where(inArray(thumbFiles.itemId, [...itemIds])).run();
    },
    all: () => db.select().from(thumbFiles).all(),
    fileUris: () =>
      new Map(
        db.select({ itemId: thumbFiles.itemId, fileUri: thumbFiles.fileUri })
          .from(thumbFiles)
          .innerJoin(items, eq(items.id, thumbFiles.itemId))
          .where(isNull(items.deletedAt))
          .all()
          .map(({ itemId, fileUri }) => [itemId, fileUri] as const),
      ),
    picturesByCollection: (limit) => {
      // Ranked in SQLite so Home, re-read on every sync write, reads at most `limit` rows a room, not the library.
      const ranked = db
        .select({
          collectionId: items.collectionId,
          fileUri: thumbFiles.fileUri,
          rank: sql<number>`row_number() over (partition by ${items.collectionId} order by ${items.createdAt} desc, ${items.id} desc)`.as('rank'),
        })
        .from(thumbFiles)
        .innerJoin(items, eq(items.id, thumbFiles.itemId))
        .where(and(isNull(items.deletedAt), isNotNull(items.collectionId)))
        .as('ranked');
      const rows = db.select({ collectionId: ranked.collectionId, fileUri: ranked.fileUri })
        .from(ranked)
        .where(lte(ranked.rank, limit))
        .orderBy(asc(ranked.collectionId), asc(ranked.rank))
        .all();
      return groupNewest(rows);
    },
  };
}
