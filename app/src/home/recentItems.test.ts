/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { createOutboxRepository } from '../db/outboxRepository.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { listRecentItems } from './recentItems.ts';

function setup() {
  const deps = createTestDeps();
  const repos = {
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    outbox: createOutboxRepository(deps),
  };
  return { ...repos, list: () => listRecentItems(repos) };
}

describe('listRecentItems', () => {
  it('names where each item hangs and whether it still waits to sync', () => {
    const s = setup();
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.items.save({ id: 'i1', sourceUrl: 'https://aeon.co/a', sharedTitle: 'On boredom', collectionId: 'c1' });
    assert.deepEqual(s.list(), [
      { id: 'i1', title: 'On boredom', url: 'https://aeon.co/a', place: 'Reading', status: 'pending', queued: true },
    ]);
  });

  it('falls back to the URL and the Inbox', () => {
    const s = setup();
    s.items.save({ id: 'i1', sourceUrl: 'https://aeon.co/a' });
    s.outbox.list().forEach((entry) => s.outbox.complete(entry.seq));
    assert.deepEqual(s.list()[0], { id: 'i1', title: 'https://aeon.co/a', url: 'https://aeon.co/a', place: 'Inbox', status: 'pending', queued: false });
  });

  it('is empty on a new device', () => {
    assert.deepEqual(setup().list(), []);
  });
});
