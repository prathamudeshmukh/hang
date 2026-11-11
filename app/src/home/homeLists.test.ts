/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { createOutboxRepository } from '../db/outboxRepository.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { readHome, readPlace, RECENT_LIMIT } from './homeLists.ts';

const URL = 'https://www.aeon.co/essays/on-boredom';

function setup() {
  const deps = createTestDeps();
  const sources = {
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    outbox: createOutboxRepository(deps),
  };
  const save = (id: string, collectionId: string | null = null) => {
    sources.items.save({ id, sourceUrl: URL, collectionId });
    deps.clock.advance(1000);
  };
  const syncAll = () => sources.outbox.list().forEach((entry) => sources.outbox.complete(entry.seq));
  return { ...sources, sources, save, syncAll };
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

  it('lists the Inbox as rows ready to show', () => {
    s.items.save({ id: 'i1', sourceUrl: URL, sharedTitle: 'On boredom' });
    assert.deepEqual(readPlace(s.sources, { kind: 'inbox' }), {
      title: 'Inbox',
      rows: [{ id: 'i1', title: 'On boredom', host: 'aeon.co', url: URL, note: 'pending · waiting to sync', inInbox: true }],
    });
  });

  it('lists one collection, falling back to the URL for a title', () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.save('i1', 'c1');
    s.save('i2');
    s.syncAll();
    const place = readPlace(s.sources, { kind: 'collection', id: 'c1' });
    assert.equal(place?.title, 'Reading');
    assert.deepEqual(place?.rows.map(({ id, title, note }) => ({ id, title, note })), [{ id: 'i1', title: URL, note: 'pending' }]);
  });

  it('does not call an item whose push failed for good "waiting to sync"', () => {
    s.save('i1');
    s.outbox.markFailed(s.outbox.list()[0], 'check constraint');
    assert.equal(readPlace(s.sources, { kind: 'inbox' })?.rows[0].note, 'pending');
  });

  it('is null for a collection that is not on the device', () => {
    assert.equal(readPlace(s.sources, { kind: 'collection', id: 'gone' }), null);
  });
});
