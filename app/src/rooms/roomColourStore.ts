import { and, desc, isNotNull, isNull, notInArray } from 'drizzle-orm';
import { collections, items, roomColours } from '../db/schema.ts';
import type { HangDb } from '../db/types.ts';
import type { RoomColours } from './roomColours.ts';
import { VOTE_LIMIT, type ColourVote } from './roomHue.ts';

/** Where room colours come from and go (#85): pictures' colours per collection, and the stored result. */
export interface RoomColourStore {
  /** Live collections' ids. */
  collectionIds(): readonly string[];
  /** Each collection's newest live items with a palette, newest first, at most VOTE_LIMIT. */
  votes(): ReadonlyMap<string, readonly ColourVote[]>;
  all(): ReadonlyMap<string, RoomColours>;
  save(collectionId: string, colours: RoomColours): void;
  /** Drops every row whose collection isn't in `liveIds`. */
  keepOnly(liveIds: readonly string[]): void;
}

const FALLBACK_KIND = 'link';

function groupVotes(rows: readonly { readonly collectionId: string | null; readonly vote: ColourVote }[]): ReadonlyMap<string, readonly ColourVote[]> {
  const ids = [...new Set(rows.flatMap(({ collectionId }) => (collectionId ? [collectionId] : [])))];
  return new Map(ids.map((id) => [id, rows.filter((row) => row.collectionId === id).slice(0, VOTE_LIMIT).map(({ vote }) => vote)]));
}

export function createRoomColourStore(db: HangDb): RoomColourStore {
  return {
    collectionIds: () => db.select({ id: collections.id }).from(collections).where(isNull(collections.deletedAt)).all().map(({ id }) => id),
    votes: () =>
      groupVotes(
        db.select({ collectionId: items.collectionId, kind: items.kind, palette: items.palette })
          .from(items)
          .where(and(isNull(items.deletedAt), isNotNull(items.collectionId), isNotNull(items.palette)))
          .orderBy(desc(items.createdAt), desc(items.id))
          .all()
          .flatMap(({ collectionId, kind, palette }) =>
            palette ? [{ collectionId, vote: { colour: palette.vibrant ?? palette.dominant, kind: kind ?? FALLBACK_KIND } }] : [],
          ),
      ),
    all: () => new Map(db.select().from(roomColours).all().map(({ collectionId, family, colours }) => [collectionId, { family, ...colours }])),
    save: (collectionId, { family, light, dark }) => {
      const row = { family, colours: { light, dark } };
      db.insert(roomColours).values({ collectionId, ...row }).onConflictDoUpdate({ target: roomColours.collectionId, set: row }).run();
    },
    keepOnly: (liveIds) => {
      db.delete(roomColours).where(liveIds.length > 0 ? notInArray(roomColours.collectionId, [...liveIds]) : undefined).run();
    },
  };
}
