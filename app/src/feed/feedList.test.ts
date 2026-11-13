/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { items, type Item } from '../db/schema.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { createThumbStore } from '../thumbs/thumbStore.ts';
import { originsOf, readFeed } from './feedList.ts';

const URL = 'https://www.aeon.co/essays/on-boredom';

function setup() {
  const deps = createTestDeps();
  const sources = {
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    thumbs: createThumbStore(deps.db),
  };
  sources.collections.create({ id: 'c1', name: 'Reading' });
  sources.collections.create({ id: 'c2', name: 'Recipes' });
  const save = (id: string, collectionId: string | null = 'c1') => sources.items.save({ id, sourceUrl: URL, collectionId });
  const update = (id: string, changes: Partial<Item>) => deps.db.update(items).set(changes).where(eq(items.id, id)).run();
  return { ...sources, sources, save, update };
}

const idsOf = (pages: readonly { readonly card: { readonly id: string } }[]) => pages.map(({ card }) => card.id);

describe('readFeed', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
    ['a', 'b', 'c'].forEach((id) => s.save(id));
  });

  it('keeps the order it was opened with', () => {
    const ids = ['c', 'a', 'b'];
    assert.deepEqual(idsOf(readFeed(s.sources, ids, originsOf(s.sources, ids))), ['c', 'a', 'b']);
  });

  it('reads each item’s latest contents', () => {
    const ids = ['a'];
    const origins = originsOf(s.sources, ids);
    s.update('a', { status: 'ready', kind: 'article', title: 'On boredom', summary: 'Why we drift.' });
    const [page] = readFeed(s.sources, ids, origins);
    assert.deepEqual([page.card.title, page.summary], ['On boredom', 'Why we drift.']);
  });

  it('drops an item deleted since the feed opened', () => {
    const ids = ['a', 'b', 'c'];
    const origins = originsOf(s.sources, ids);
    s.items.remove('b');
    assert.deepEqual(idsOf(readFeed(s.sources, ids, origins)), ['a', 'c']);
  });
});

describe('readFeed moves', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
    s.save('a');
  });

  it('keeps a moved item in place and says where it went', () => {
    const origins = originsOf(s.sources, ['a']);
    s.items.file('a', 'c2');
    const [page] = readFeed(s.sources, ['a'], origins);
    assert.deepEqual([page.card.id, page.note, page.placeId], ['a', 'moved to Recipes', 'c2']);
  });

  it('says so when an item is moved to the Inbox', () => {
    const origins = originsOf(s.sources, ['a']);
    s.items.file('a', null);
    assert.equal(readFeed(s.sources, ['a'], origins)[0].note, 'moved to Inbox');
  });

  it('says it moved when the new place is not on the device', () => {
    const origins = originsOf(s.sources, ['a']);
    s.update('a', { collectionId: 'c9' });
    assert.equal(readFeed(s.sources, ['a'], origins)[0].note, 'moved');
  });

  it('keeps the catalogue note when an item is moved back where it was', () => {
    const origins = originsOf(s.sources, ['a']);
    s.items.file('a', 'c2');
    s.items.file('a', 'c1');
    assert.equal(readFeed(s.sources, ['a'], origins)[0].note, 'fetching…');
  });
});
