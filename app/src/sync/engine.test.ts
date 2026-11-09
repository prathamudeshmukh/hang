/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { createOutboxRepository } from '../db/outboxRepository.ts';
import { createSqliteSyncStore } from '../db/sqliteSyncStore.ts';
import { itemContent } from '../db/schema.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { NIL_ID } from './cursor.ts';
import { createSyncEngine } from './engine.ts';
import { createFakeRemote } from './testing/fakeRemote.ts';
import { RemoteError } from './types.ts';

const URL = 'https://aeon.co/essays/on-boredom';
const OFFLINE = new RemoteError('network down', { retryable: true });

function setup(options = {}) {
  const deps = createTestDeps();
  const remote = createFakeRemote();
  const store = createSqliteSyncStore(deps);
  return {
    ...deps,
    remote,
    store,
    collections: createCollectionsRepository(deps),
    items: createItemsRepository(deps),
    outbox: createOutboxRepository(deps),
    engine: createSyncEngine({ store, remote, clock: deps.clock, options }),
  };
}

describe('sync engine: push', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup();
  });

  it('replays the outbox in order and empties it', async () => {
    t.collections.create({ id: 'c1', name: 'Reading' });
    t.items.save({ id: 'i1', sourceUrl: URL, collectionId: 'c1' });
    const report = await t.engine.sync();
    assert.deepEqual(t.remote.pushes.map((p) => `${p.op} ${p.tableName}`), ['upsert collections', 'upsert items']);
    assert.equal(report.pushed, 2);
    assert.equal(t.outbox.list().length, 0);
  });

  it('is idempotent: a push repeated after a lost response leaves one row', async () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    const [entry] = t.outbox.list();
    await t.remote.push({ tableName: 'items', rowId: 'i1', op: entry.op, payload: entry.payload });
    await t.engine.sync();
    assert.equal(t.remote.rows('items').length, 1);
  });

  it('backs off after a retryable failure and keeps later entries waiting behind it', async () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    t.items.markRead('i1');
    t.remote.failNextPush(OFFLINE);
    const report = await t.engine.sync();
    assert.deepEqual({ pushed: report.pushed, waiting: report.waiting }, { pushed: 0, waiting: true });
    assert.deepEqual(t.outbox.list().map((e) => [e.attempts, e.nextAttemptAt]), [[1, t.clock.now() + 2000], [0, 0]]);
  });

  it('does not retry before the backoff ends, then succeeds', async () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    t.remote.failNextPush(OFFLINE);
    await t.engine.sync();
    await t.engine.sync();
    assert.equal(t.remote.pushes.length, 0);
    t.clock.advance(2000);
    assert.equal((await t.engine.sync()).pushed, 1);
  });

  it('fails the later entries of a row whose upsert failed for good', async () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    t.items.markRead('i1');
    t.items.save({ id: 'i2', sourceUrl: URL });
    t.remote.failNextPush(new RemoteError('check violation', { retryable: false }));
    const report = await t.engine.sync();
    assert.deepEqual(t.outbox.list().map((e) => [e.rowId, e.op, e.status]), [['i1', 'upsert', 'failed'], ['i1', 'patch', 'failed']]);
    assert.deepEqual(t.remote.attempts.map((p) => `${p.op} ${p.rowId}`), ['upsert i1', 'upsert i2']);
    assert.equal(report.failed, 2);
  });

  it('treats an unknown error as retryable', async () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    t.remote.failNextPush(new TypeError('Network request failed'));
    await t.engine.sync();
    assert.equal(t.outbox.list()[0].status, 'pending');
  });

  it('sets aside a permanently failing entry and carries on', async () => {
    t.items.save({ id: 'i1', sourceUrl: URL });
    t.items.save({ id: 'i2', sourceUrl: URL });
    t.remote.failNextPush(new RemoteError('check violation', { retryable: false }));
    const report = await t.engine.sync();
    assert.deepEqual({ pushed: report.pushed, failed: report.failed }, { pushed: 1, failed: 1 });
    assert.deepEqual(t.outbox.list().map((e) => [e.rowId, e.status, e.lastError]), [['i1', 'failed', 'check violation']]);
  });
});

describe('sync engine: pull', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(() => {
    t = setup({ pageSize: 2, overlapMs: 5000 });
  });

  it('applies server rows (dropping user_id) and remembers the cursor', async () => {
    t.remote.write('collections', { id: 'c1', user_id: 'u1', name: 'Reading', position: 0, created_at: '2026-11-09T09:00:00+00:00' });
    const last = t.remote.write('items', { id: 'i1', user_id: 'u1', source_url: URL, status: 'ready', title: 'On boredom', tags: ['essay'], created_at: '2026-11-09T09:00:00+00:00' });
    await t.engine.sync();
    assert.equal(t.collections.list()[0].name, 'Reading');
    assert.deepEqual(t.items.getById('i1')?.tags, ['essay']);
    assert.deepEqual(t.store.readCursor('items'), { updatedAt: last.updated_at, id: 'i1' });
  });

  it('pages through until a short page', async () => {
    ['i1', 'i2', 'i3'].forEach((id) => t.remote.write('items', { id, source_url: URL, created_at: '2026-11-09T09:00:00+00:00' }));
    const report = await t.engine.sync();
    assert.equal(report.pulled.items, 3);
    assert.equal(t.remote.pulls.filter((p) => p.tableName === 'items').length, 2);
  });

  it('starts the next pull an overlap window before the cursor', async () => {
    t.remote.seed('items', { id: 'i1', source_url: URL, created_at: '2026-11-09T09:00:00+00:00', updated_at: '2026-11-09T10:00:05.000001+00:00' });
    await t.engine.sync();
    await t.engine.sync();
    assert.deepEqual(t.remote.pulls.filter((p) => p.tableName === 'items').at(-1)?.after, { updatedAt: '2026-11-09T10:00:00.000001Z', id: NIL_ID });
  });

  it('catches a row that committed late inside the window, without moving the cursor back', async () => {
    t.remote.seed('items', { id: 'i2', source_url: URL, created_at: '2026-11-09T09:00:00+00:00', updated_at: '2026-11-09T10:00:05+00:00' });
    await t.engine.sync();
    t.remote.seed('items', { id: 'i1', source_url: URL, created_at: '2026-11-09T09:00:00+00:00', updated_at: '2026-11-09T10:00:03+00:00' });
    await t.engine.sync();
    assert.ok(t.items.getById('i1'));
    assert.deepEqual(t.store.readCursor('items'), { updatedAt: '2026-11-09T10:00:05+00:00', id: 'i2' });
  });

  it('keeps an un-pushed collection change while taking the server enrichment', async () => {
    t.collections.create({ id: 'c1', name: 'Reading' });
    t.remote.write('items', { id: 'i1', source_url: URL, status: 'pending', created_at: '2026-11-09T09:00:00+00:00' });
    await t.engine.sync();
    t.items.file('i1', 'c1');
    t.remote.write('items', { id: 'i1', status: 'ready', title: 'On boredom' });
    t.remote.failNextPush(OFFLINE);
    await t.engine.sync();
    assert.deepEqual(
      (({ collectionId, status, title }) => ({ collectionId, status, title }))(t.items.getById('i1')!),
      { collectionId: 'c1', status: 'ready', title: 'On boredom' },
    );
  });

  it('takes a server-side change to a user field once nothing local is pending', async () => {
    t.remote.write('items', { id: 'i1', source_url: URL, created_at: '2026-11-09T09:00:00+00:00' });
    await t.engine.sync();
    t.remote.write('items', { id: 'i1', read_at: '2026-11-09T11:00:00+00:00' });
    await t.engine.sync();
    assert.equal(t.items.getById('i1')?.readAt, '2026-11-09T11:00:00+00:00');
  });

  it('purges a tombstoned item and its content', async () => {
    t.remote.write('items', { id: 'i1', source_url: URL, created_at: '2026-11-09T09:00:00+00:00' });
    t.remote.write('item_content', { item_id: 'i1', text: 'Long read' });
    await t.engine.sync();
    t.remote.write('items', { id: 'i1', deleted_at: '2026-11-09T12:00:00+00:00' });
    t.remote.write('item_content', { item_id: 'i1', deleted_at: '2026-11-09T12:00:00+00:00' });
    await t.engine.sync();
    assert.equal(t.items.getById('i1'), undefined);
    assert.equal(t.db.select().from(itemContent).all().length, 0);
  });

  it('rejects a malformed page and leaves the cursor where it was', async () => {
    t.remote.seed('items', { id: 'i1', source_url: URL, updated_at: null });
    await assert.rejects(t.engine.sync(), /malformed items row/i);
    assert.equal(t.store.readCursor('items'), null);
  });
});

describe('sync engine: runs', () => {
  it('folds calls made during a run into one follow-up run', async () => {
    const t = setup();
    const reports = await Promise.all([t.engine.sync(), t.engine.sync(), t.engine.sync()]);
    assert.equal(reports[1], reports[2]);
    assert.equal(t.remote.pulls.length, 6);
  });

  it('pushes a save made while a run is already past its push', async () => {
    const t = setup();
    const first = t.engine.sync();
    t.items.save({ id: 'i1', sourceUrl: URL });
    const second = await t.engine.sync();
    await first;
    assert.equal(second.pushed, 1);
  });

  it('starts a fresh run once the previous one finished', async () => {
    const t = setup();
    await t.engine.sync();
    await t.engine.sync();
    assert.equal(t.remote.pulls.length, 6);
  });

  it('runs again after a failed run', async () => {
    const t = setup();
    t.remote.seed('items', { id: 'i1', source_url: URL, updated_at: null });
    await assert.rejects(t.engine.sync());
    t.remote.seed('items', { id: 'i1', source_url: URL, created_at: '2026-11-09T09:00:00+00:00', updated_at: '2026-11-09T10:00:00+00:00' });
    assert.equal((await t.engine.sync()).pulled.items, 1);
  });

  it('stops a remote that keeps returning the same page', async () => {
    const t = setup();
    const row = { id: 'i1', source_url: URL, created_at: '2026-11-09T09:00:00+00:00', updated_at: '2026-11-09T10:00:00+00:00' };
    const stuck = createSyncEngine({ store: t.store, remote: { ...t.remote, pull: async ({ tableName }) => (tableName === 'items' ? [row] : []) }, clock: t.clock, options: { pageSize: 1 } });
    await assert.rejects(stuck.sync(), /did not advance/);
  });
});

describe('sync engine: item content', () => {
  it('purges tombstoned content', async () => {
    const t = setup();
    t.remote.write('item_content', { item_id: 'i1', text: 'Long read' });
    await t.engine.sync();
    t.remote.write('item_content', { item_id: 'i1', deleted_at: '2026-11-09T12:00:00+00:00' });
    await t.engine.sync();
    assert.equal(t.db.select().from(itemContent).all().length, 0);
  });

  it('stores content that arrives before its item', async () => {
    const t = setup();
    t.remote.write('item_content', { item_id: 'i1', text: 'Long read', word_count: 2 });
    await t.engine.sync();
    assert.equal(t.db.select().from(itemContent).get()?.wordCount, 2);
  });
});
