/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from './collectionsRepository.ts';
import { createDeviceOwnerRepository } from './deviceOwnerRepository.ts';
import { createItemsRepository } from './itemsRepository.ts';
import { createOutboxRepository } from './outboxRepository.ts';
import { roomColours } from '../rooms/roomColours.ts';
import { collections, firstPull, items, roomColours as roomColourRows, syncState, thumbFiles } from './schema.ts';
import { createTestDeps } from './testing/testDb.ts';

const ALICE = '11111111-1111-4111-8111-111111111111';
const BOB = '22222222-2222-4222-8222-222222222222';
const URL = 'https://aeon.co/essays/on-boredom';

function setup() {
  const deps = createTestDeps();
  return {
    ...deps,
    owner: createDeviceOwnerRepository(deps),
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    outbox: createOutboxRepository(deps),
  };
}

function seedLocalData(t: ReturnType<typeof setup>): void {
  t.collections.create({ id: 'c1', name: 'Reading' });
  t.items.save({ id: 'i1', sourceUrl: URL, collectionId: 'c1' });
  t.db.insert(syncState).values({ tableName: 'items', cursorUpdatedAt: '2026-11-09T10:00:00+00:00', cursorId: 'i1' }).run();
  t.db.insert(thumbFiles).values({ itemId: 'i1', fileUri: 'file:///thumbs/i1.webp' }).run();
  t.db.insert(firstPull).values({ id: 1, pulledAt: '2026-11-09T10:00:00.000Z' }).run();
  const { light, dark } = roomColours({ kind: 'grey' })!;
  t.db.insert(roomColourRows).values({ collectionId: 'c1', family: null, colours: { light, dark } }).run();
}

const localRowCount = (t: ReturnType<typeof setup>) =>
  [items, syncState, thumbFiles, firstPull, roomColourRows].reduce((sum, table) => sum + t.db.select().from(table).all().length, t.outbox.list().length);

describe('device owner: binding a signed-in user', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('claims unclaimed data (shares saved before any sign-in) and keeps it', () => {
    seedLocalData(t);
    const outcome = t.owner.bindTo(ALICE);
    assert.equal(outcome, 'claimed');
    assert.equal(t.owner.current(), ALICE);
    assert.equal(t.outbox.list().length, 2);
  });

  it('resumes when the same user signs back in, keeping the outbox', () => {
    t.owner.bindTo(ALICE);
    seedLocalData(t);
    const outcome = t.owner.bindTo(ALICE);
    assert.equal(outcome, 'resumed');
    assert.equal(t.outbox.list().length, 2);
  });

  it('wipes the previous user\'s data before a different user takes the device', () => {
    t.owner.bindTo(ALICE);
    seedLocalData(t);
    const outcome = t.owner.bindTo(BOB);
    assert.equal(outcome, 'reset');
    assert.equal(t.owner.current(), BOB);
    assert.equal(localRowCount(t), 0);
  });
});

describe('device owner: wipe', () => {
  it('empties every local table and forgets the owner', () => {
    const t = setup();
    t.owner.bindTo(ALICE);
    seedLocalData(t);
    t.owner.wipe();
    assert.equal(t.owner.current(), null);
    assert.equal(t.db.select().from(collections).all().length + t.db.select().from(items).all().length, 0);
    assert.equal(localRowCount(t), 0);
  });

  it('has no owner on a fresh install', () => {
    assert.equal(setup().owner.current(), null);
  });
});

describe('device owner: links waiting to be claimed (#77)', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('counts live items, filed or not, on a device nobody owns', () => {
    t.collections.create({ id: 'c1', name: 'Reading' });
    t.items.save({ id: 'i1', sourceUrl: URL, collectionId: 'c1' });
    t.items.save({ id: 'i2', sourceUrl: `${URL}?2` });
    assert.equal(t.owner.unclaimedCount(), 2);
  });

  it('leaves out items taken down', () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    t.items.save({ id: 'i2', sourceUrl: `${URL}?2` });
    t.items.remove('i2');
    assert.equal(t.owner.unclaimedCount(), 1);
  });

  it('counts nothing once someone owns the device (a session that ended on its own keeps its rows)', () => {
    t.owner.bindTo(ALICE);
    t.items.save({ id: 'i1', sourceUrl: URL });
    assert.equal(t.owner.unclaimedCount(), 0);
  });
});
