/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { eq } from 'drizzle-orm';
import { items, type Item } from '../db/schema.ts';
import { createTestDeps, T0 } from '../db/testing/testDb.ts';
import { createThumbStore } from '../thumbs/thumbStore.ts';
import { dayKey } from './homeCopy.ts';
import { readHome, readPlace, RECENT_LIMIT } from './homeLists.ts';

const URL = 'https://www.aeon.co/essays/on-boredom';

const NOW = new Date(T0);
const LONG_AGO = '2026-08-01T10:00:00.000Z';

function setup() {
  const deps = createTestDeps();
  const sources = {
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    thumbs: createThumbStore(deps.db),
  };
  const save = (id: string, collectionId: string | null = null) => {
    sources.items.save({ id, sourceUrl: URL, collectionId });
    deps.clock.advance(1000);
  };
  const update = (id: string, changes: Partial<Item>) => deps.db.update(items).set(changes).where(eq(items.id, id)).run();
  const markReady = (id: string, thumb: { readonly thumbW: number; readonly thumbH: number }) => update(id, { status: 'ready', ...thumb });
  return { ...sources, sources, save, update, markReady };
}

describe('readHome', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it('is empty on a new device', () => {
    assert.deepEqual(readHome(s.sources, NOW), { recent: [], inboxCount: 0, rediscover: null, collections: [] });
  });

  it('prints recent items newest first, marking the ones in the Inbox', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.save('i1', 'c1');
    s.save('i2');
    assert.deepEqual(readHome(s.sources, NOW).recent.map(({ card, inInbox }) => ({ id: card.id, inInbox })), [
      { id: 'i2', inInbox: true },
      { id: 'i1', inInbox: false },
    ]);
  });

  it(`keeps only the latest ${RECENT_LIMIT}`, () => {
    Array.from({ length: RECENT_LIMIT + 1 }, (_, n) => s.save(`i${n}`));
    assert.equal(readHome(s.sources, NOW).recent.length, RECENT_LIMIT);
  });

  it('counts the Inbox and each collection, empty ones included', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.collections.create({ id: 'c2', name: 'Watch' });
    s.save('i1', 'c1');
    s.save('i2');
    const home = readHome(s.sources, NOW);
    assert.equal(home.inboxCount, 1);
    assert.deepEqual(home.collections.map(({ id, count }) => ({ id, count })), [{ id: 'c1', count: 1 }, { id: 'c2', count: 0 }]);
  });

  it('covers a collection with its newest downloaded thumbnail, else nothing', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.collections.create({ id: 'c2', name: 'Watch' });
    s.save('i1', 'c1');
    s.thumbs.record('i1', 'file:///thumbs/i1.webp');
    assert.deepEqual(readHome(s.sources, NOW).collections.map(({ coverUri }) => coverUri), ['file:///thumbs/i1.webp', null]);
  });

  it('offers an old, unopened item for Rediscover, not yet stamped today', () => {
    s.save('old');
    s.update('old', { createdAt: LONG_AGO });
    s.save('new');
    const pick = readHome(s.sources, NOW).rediscover;
    assert.deepEqual(pick && { id: pick.card.id, savedNote: pick.savedNote, stampedToday: pick.stampedToday }, {
      id: 'old',
      savedNote: 'from August',
      stampedToday: false,
    });
  });

  it('knows when the Rediscover pick is already stamped today', () => {
    s.save('old');
    s.update('old', { createdAt: LONG_AGO, rediscoveredOn: dayKey(NOW) });
    assert.equal(readHome(s.sources, NOW).rediscover?.stampedToday, true);
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
