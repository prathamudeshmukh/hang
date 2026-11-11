/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from './collectionsRepository.ts';
import { createItemsRepository } from './itemsRepository.ts';
import { createOutboxRepository } from './outboxRepository.ts';
import { createTestDeps, T0 } from './testing/testDb.ts';

const NOW = new Date(T0).toISOString();
const URL = 'https://aeon.co/essays/on-boredom';

function setup() {
  const deps = createTestDeps();
  return {
    clock: deps.clock,
    collections: createCollectionsRepository(deps),
    items: createItemsRepository(deps),
    outbox: createOutboxRepository(deps),
  };
}

describe('collections repository', () => {
  let repo: ReturnType<typeof setup>;
  beforeEach(() => {
    repo = setup();
  });

  it('creates a collection at the end of the list and queues an upsert', () => {
    repo.collections.create({ id: 'c1', name: 'Reading' });
    const created = repo.collections.create({ id: 'c2', name: '  Watch later ' });
    assert.deepEqual(created, { id: 'c2', name: 'Watch later', position: 1, createdAt: NOW });
    assert.deepEqual(repo.outbox.list().at(-1)?.payload, { id: 'c2', name: 'Watch later', position: 1, created_at: NOW });
  });

  it('lists collections by position', () => {
    repo.collections.create({ id: 'c1', name: 'B' });
    repo.collections.create({ id: 'c2', name: 'A' });
    assert.deepEqual(repo.collections.list().map((c) => c.id), ['c1', 'c2']);
  });

  it('rejects a blank or too-long name without writing anything', () => {
    assert.throws(() => repo.collections.create({ id: 'c1', name: '   ' }), /name/i);
    assert.throws(() => repo.collections.create({ id: 'c1', name: 'x'.repeat(81) }), /name/i);
    assert.equal(repo.outbox.list().length, 0);
  });

  it('refuses a name already in use, ignoring case and spaces', () => {
    repo.collections.create({ id: 'c1', name: 'Reading' });
    assert.throws(() => repo.collections.create({ id: 'c2', name: ' reading ' }), /already have “Reading”/);
    assert.equal(repo.collections.list().length, 1);
  });

  it('treats composed and decomposed accents as the same name', () => {
    repo.collections.create({ id: 'c1', name: 'Caf\u00e9' });
    assert.throws(() => repo.collections.create({ id: 'c2', name: 'Cafe\u0301' }), /already have/);
  });
});

describe('items repository', () => {
  let repo: ReturnType<typeof setup>;
  beforeEach(() => {
    repo = setup();
  });

  it('saves a share as a pending Inbox item and queues an upsert', () => {
    const item = repo.items.save({ id: 'i1', sourceUrl: URL, sharedTitle: 'On boredom' });
    assert.equal(item.status, 'pending');
    assert.equal(item.collectionId, null);
    assert.deepEqual(repo.outbox.list()[0], {
      ...repo.outbox.list()[0],
      tableName: 'items',
      op: 'upsert',
      payload: { id: 'i1', source_url: URL, shared_title: 'On boredom', collection_id: null, created_at: NOW },
    });
  });

  it('rejects a non-http URL', () => {
    assert.throws(() => repo.items.save({ id: 'i1', sourceUrl: 'javascript:alert(1)' }), /http/);
    assert.equal(repo.outbox.list().length, 0);
  });

  it('files an item into a collection and queues only that field', () => {
    repo.collections.create({ id: 'c1', name: 'Reading' });
    repo.items.save({ id: 'i1', sourceUrl: URL });
    repo.items.file('i1', 'c1');
    assert.equal(repo.items.getById('i1')?.collectionId, 'c1');
    assert.deepEqual(repo.outbox.list().at(-1)?.payload, { collection_id: 'c1' });
  });

  it('refuses to file into a collection that does not exist', () => {
    repo.items.save({ id: 'i1', sourceUrl: URL });
    assert.throws(() => repo.items.file('i1', 'nope'), /collection nope not found/);
  });

  it('refuses to change an item that does not exist', () => {
    assert.throws(() => repo.items.markRead('nope'), /item nope not found/);
    assert.equal(repo.outbox.list().length, 0);
  });

  it('marks an item read with the current time', () => {
    repo.items.save({ id: 'i1', sourceUrl: URL });
    repo.clock.advance(60_000);
    repo.items.markRead('i1');
    assert.equal(repo.items.getById('i1')?.readAt, '2026-11-09T10:01:00.000Z');
  });

  it('soft-deletes an item: hidden from lists, tombstone queued', () => {
    repo.items.save({ id: 'i1', sourceUrl: URL });
    repo.items.remove('i1');
    assert.deepEqual(repo.items.listInbox(), []);
    assert.deepEqual(repo.outbox.list().at(-1)?.payload, { deleted_at: NOW });
  });

  it('lists the Inbox and each collection newest first', () => {
    repo.collections.create({ id: 'c1', name: 'Reading' });
    repo.items.save({ id: 'i1', sourceUrl: URL });
    repo.clock.advance(1000);
    repo.items.save({ id: 'i2', sourceUrl: URL });
    repo.clock.advance(1000);
    repo.items.save({ id: 'i3', sourceUrl: URL, collectionId: 'c1' });
    assert.deepEqual(repo.items.listInbox().map((i) => i.id), ['i2', 'i1']);
    assert.deepEqual(repo.items.listInCollection('c1').map((i) => i.id), ['i3']);
  });

  it('lists the most recent live items across the Inbox and collections', () => {
    repo.collections.create({ id: 'c1', name: 'Reading' });
    ['i1', 'i2', 'i3'].forEach((id) => {
      repo.items.save({ id, sourceUrl: URL, collectionId: id === 'i2' ? 'c1' : null });
      repo.clock.advance(1000);
    });
    repo.items.remove('i3');
    assert.deepEqual(repo.items.listRecent(5).map((i) => i.id), ['i2', 'i1']);
    assert.deepEqual(repo.items.listRecent(1).map((i) => i.id), ['i2']);
  });

  it('counts live items per collection, with the Inbox under null', () => {
    repo.collections.create({ id: 'c1', name: 'Reading' });
    ['i1', 'i2', 'i3', 'i4'].forEach((id, n) => repo.items.save({ id, sourceUrl: URL, collectionId: n < 2 ? 'c1' : null }));
    repo.items.remove('i4');
    assert.deepEqual(repo.items.countByCollection(), new Map([[null, 1], ['c1', 2]]));
  });

  it('has no counts on a new device', () => {
    assert.equal(repo.items.countByCollection().size, 0);
  });

  it('breaks same-millisecond ties by the time-ordered id, newest first', () => {
    repo.items.save({ id: '01a1-a', sourceUrl: URL });
    repo.items.save({ id: '01a1-b', sourceUrl: URL });
    assert.deepEqual(repo.items.listRecent(5).map((i) => i.id), ['01a1-b', '01a1-a']);
  });
});
