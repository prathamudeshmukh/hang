import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import type { ItemsRepository } from '../db/itemsRepository.ts';
import type { Item } from '../db/schema.ts';
import { toCardModel } from '../grid/cardModel.ts';
import type { ThumbStore } from '../thumbs/thumbStore.ts';
import { toFeedPage, type FeedPage } from './feedPage.ts';
import { placeName } from './moveChoices.ts';

export interface FeedSources {
  readonly items: Pick<ItemsRepository, 'listByIds'>;
  readonly collections: Pick<CollectionsRepository, 'list'>;
  readonly thumbs: Pick<ThumbStore, 'fileUris'>;
}

/** Where each item hung when the feed opened, so a move shows as *moved to X*. */
export type Origins = ReadonlyMap<string, string | null>;

/** One read for the whole list, put back in the snapshot's order. */
function liveItems(sources: FeedSources, ids: readonly string[]): readonly Item[] {
  const byId = new Map(sources.items.listByIds(ids).map((item) => [item.id, item]));
  return ids.map((id) => byId.get(id)).filter((item) => item !== undefined);
}

export function originsOf(sources: FeedSources, ids: readonly string[]): Origins {
  return new Map(liveItems(sources, ids).map((item) => [item.id, item.collectionId]));
}

/** The snapshot's order with each item's latest contents; items deleted since are dropped (#31). */
export function readFeed(sources: FeedSources, ids: readonly string[], origins: Origins): readonly FeedPage[] {
  const thumbs = sources.thumbs.fileUris();
  const collections = sources.collections.list();
  return liveItems(sources, ids).map((item) => {
    const moved = origins.has(item.id) && origins.get(item.id) !== item.collectionId;
    return toFeedPage(toCardModel(item, thumbs.get(item.id) ?? null), {
      summary: item.summary,
      ...(moved ? { movedTo: placeName(collections, item.collectionId) } : {}),
      placeId: item.collectionId,
    });
  });
}
