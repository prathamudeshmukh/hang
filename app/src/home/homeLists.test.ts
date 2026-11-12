/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { createOutboxRepository } from '../db/outboxRepository.ts';
import { eq } from 'drizzle-orm';
import { items } from '../db/schema.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { createThumbStore } from '../thumbs/thumbStore.ts';
import { readHome, readPlace, RECENT_LIMIT } from './homeLists.ts';

const URL = 'https://www.aeon.co/essays/on-boredom';

function setup() {
  const deps = createTestDeps();
  const sources = {
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    outbox: createOutboxRepository(deps),
    thumbs: createThumbStore(deps.db),
  };
  const save = (id: string, collectionId: string | null = null) => {
    sources.items.save({ id, sourceUrl: URL, collectionId });
    deps.clock.advance(1000);
  };
  const markReady = (id: string, thumb: { readonly thumbW: number; readonly thumbH: number }) =>
    deps.db.update(items).set({ status: 'ready', ...thumb }).where(eq(items.id, id)).run();
  return { ...sources, sources, save, markReady };
}

describe('readHome', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it('is empty on a new device', () => {
    assert.deepEqual(readHome(s.sources), { recent: [], inboxCount: 0, collections: [] });
  });

  it('lists recent items newest first, marking the ones in the Inbox', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.save('i1', 'c1');
    s.save('i2');
    assert.deepEqual(readHome(s.sources).recent.map(({ id, inInbox }) => ({ id, inInbox })), [
      { id: 'i2', inInbox: true },
      { id: 'i1', inInbox: false },
    ]);
  });

  it(`keeps only the latest ${RECENT_LIMIT}`, () => {
    Array.from({ length: RECENT_LIMIT + 1 }, (_, n) => s.save(`i${n}`));
    assert.equal(readHome(s.sources).recent.length, RECENT_LIMIT);
  });

  it('counts the Inbox and each collection, empty ones included', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.collections.create({ id: 'c2', name: 'Watch' });
    s.save('i1', 'c1');
    s.save('i2');
    const home = readHome(s.sources);
    assert.equal(home.inboxCount, 1);
    assert.deepEqual(home.collections, [
      { id: 'c1', name: 'Reading', count: 1 },
      { id: 'c2', name: 'Watch', count: 0 },
    ]);
  });
});

describe('readPlace', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it('lists the Inbox as cards ready to draw', () => {
    s.items.save({ id: 'i1', sourceUrl: URL, sharedTitle: 'On boredom' });
    const place = readPlace(s.sources, { kind: 'inbox' });
    assert.equal(place?.title, 'Inbox');
    assert.deepEqual(place?.cards.map(({ id, variant, title, note }) => ({ id, variant, title, note })), [
      { id: 'i1', variant: 'pending', title: 'On boredom', note: 'fetching…' },
    ]);
  });

  it('gives each card its downloaded thumbnail, if any', () => {
    s.items.save({ id: 'with', sourceUrl: URL });
    s.markReady('with', { thumbW: 100, thumbH: 100 });
    s.thumbs.record('with', 'file:///thumbs/with.webp');
    const cards = readPlace(s.sources, { kind: 'inbox' })?.cards ?? [];
    assert.deepEqual(cards[0].media, { ratio: 1, uri: 'file:///thumbs/with.webp' });
  });

  it('lists one collection, newest first', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.save('i1', 'c1');
    s.save('i2', 'c1');
    s.save('i3');
    const place = readPlace(s.sources, { kind: 'collection', id: 'c1' });
    assert.equal(place?.title, 'Reading');
    assert.deepEqual(place?.cards.map(({ id }) => id), ['i2', 'i1']);
  });

  it('is null for a collection that is not on the device', () => {
    assert.equal(readPlace(s.sources, { kind: 'collection', id: 'gone' }), null);
  });
});
