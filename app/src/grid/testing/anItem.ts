import type { Item } from '../../db/schema.ts';

const BLANK_ITEM: Item = {
  id: 'i1',
  collectionId: null,
  sourceUrl: 'https://www.aeon.co/essays/on-boredom',
  sharedTitle: null,
  canonicalUrl: null,
  kind: null,
  adapter: null,
  status: 'pending',
  extractError: null,
  title: null,
  rawTitle: null,
  summary: null,
  tags: null,
  siteName: null,
  author: null,
  publishedAt: null,
  durationS: null,
  readingMin: null,
  imageUrl: null,
  thumbPath: null,
  thumbW: null,
  thumbH: null,
  palette: null,
  post: null,
  embed: null,
  aiCollectionId: null,
  aiConfidence: null,
  readAt: null,
  progress: null,
  lastOpenedAt: null,
  rediscoveredOn: null,
  createdAt: '2026-11-12T10:00:00.000Z',
  updatedAt: null,
  deletedAt: null,
};

/** A moment shortly after `createdAt`, for card models in tests that don't care about time. */
export const CARD_NOW = new Date('2026-11-12T10:00:30.000Z');

/** A just-shared item, with whatever the test cares about laid over it. */
export function anItem(overrides: Partial<Item> = {}): Item {
  return { ...BLANK_ITEM, ...overrides };
}
