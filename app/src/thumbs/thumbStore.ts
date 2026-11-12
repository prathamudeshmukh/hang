import { and, desc, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm';
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
  };
}
