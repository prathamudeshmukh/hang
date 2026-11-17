import { and, eq, inArray, isNull, ne, sql } from 'drizzle-orm';
import { chunksOf } from './chunks.ts';
import { itemContent } from './schema.ts';
import type { HangDb } from './types.ts';

/** Enough of an article's text to fill a tall text page at the smallest font scale (#61); the rest stays on disk. */
export const OPENING_CHARS = 2000;

const hasText = and(isNull(itemContent.deletedAt), ne(itemContent.text, ''));

/** Reads the reader text `extract` keeps for articles (SPEC §5 `item_content`); it only ever arrives by sync. */
export function createContentRepository(db: HangDb) {
  const openingsOf = (ids: readonly string[]) =>
    db
      .select({ itemId: itemContent.itemId, opening: sql<string>`substr(${itemContent.text}, 1, ${OPENING_CHARS})` })
      .from(itemContent)
      .where(and(hasText, inArray(itemContent.itemId, [...ids])))
      .all();

  return {
    /** The start of each listed item's text, by id; items without any are left out. */
    openings(ids: readonly string[]): ReadonlyMap<string, string> {
      return new Map(chunksOf(ids).flatMap(openingsOf).map(({ itemId, opening }) => [itemId, opening]));
    },
    hasOpening(id: string): boolean {
      return db.select({ itemId: itemContent.itemId }).from(itemContent).where(and(hasText, eq(itemContent.itemId, id))).get() !== undefined;
    },
  };
}

export type ContentRepository = ReturnType<typeof createContentRepository>;
