/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { items, type ItemStatus } from '../db/schema.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import type { HangDb } from '../db/types.ts';
import { createThumbStore, type ThumbStore } from './thumbStore.ts';

interface Seed {
  readonly id: string;
  readonly createdAt: string;
  readonly status?: ItemStatus;
  readonly thumbPath?: string | null;
  readonly deletedAt?: string | null;
  readonly collectionId?: string | null;
}

function seed(db: HangDb, { id, createdAt, status = 'ready', thumbPath = `u/thumbs/${id}.webp`, deletedAt = null, collectionId = null }: Seed): void {
  db.insert(items).values({ id, sourceUrl: `https://a.test/${id}`, status, thumbPath, createdAt, deletedAt, collectionId }).run();
}

describe('thumb store', () => {
  let db: HangDb;
  let store: ThumbStore;
  beforeEach(() => {
    db = createTestDeps().db;
    store = createThumbStore(db);
  });

  it('lists ready, live items with a thumbnail and no file yet, newest first', () => {
    seed(db, { id: 'old', createdAt: '2026-11-01T00:00:00Z' });
    seed(db, { id: 'new', createdAt: '2026-11-10T00:00:00Z' });
    seed(db, { id: 'done', createdAt: '2026-11-05T00:00:00Z' });
    [{ id: 'pending', status: 'pending' as const }, { id: 'noThumb', thumbPath: null }, { id: 'gone', deletedAt: '2026-11-11T00:00:00Z' }]
      .forEach((extra) => seed(db, { createdAt: '2026-11-12T00:00:00Z', ...extra }));
    store.record('done', 'file:///thumbs/done.webp');
    assert.deepEqual(store.missing(), [
      { itemId: 'new', thumbPath: 'u/thumbs/new.webp' },
      { itemId: 'old', thumbPath: 'u/thumbs/old.webp' },
    ]);
  });

  it('gives the lists the file of each live item that has one', () => {
    seed(db, { id: 'a', createdAt: '2026-11-01T00:00:00Z' });
    store.record('a', 'file:///thumbs/a.webp');
    assert.deepEqual([...store.fileUris()], [['a', 'file:///thumbs/a.webp']]);
  });

  it('covers each collection with its newest live item that has a file', () => {
    seed(db, { id: 'older', createdAt: '2026-11-01T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'newer', createdAt: '2026-11-05T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'newestNoFile', createdAt: '2026-11-09T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'gone', createdAt: '2026-11-10T00:00:00Z', collectionId: 'c1', deletedAt: '2026-11-11T00:00:00Z' });
    ['older', 'newer', 'gone'].forEach((id) => store.record(id, `file:///thumbs/${id}.webp`));
    assert.deepEqual([...store.coversByCollection()], [['c1', 'file:///thumbs/newer.webp']]);
  });

  it('gives Inbox items no cover', () => {
    seed(db, { id: 'a', createdAt: '2026-11-01T00:00:00Z' });
    store.record('a', 'file:///thumbs/a.webp');
    assert.equal(store.coversByCollection().size, 0);
  });

  it('finds files whose item was deleted or purged, and forgets them', () => {
    seed(db, { id: 'kept', createdAt: '2026-11-01T00:00:00Z' });
    seed(db, { id: 'tombstoned', createdAt: '2026-11-01T00:00:00Z', deletedAt: '2026-11-11T00:00:00Z' });
    ['kept', 'tombstoned', 'purged'].forEach((id) => store.record(id, `file:///thumbs/${id}.webp`));
    const stale = store.stale();
    store.forget(stale.map(({ itemId }) => itemId));
    assert.deepEqual(stale.map(({ itemId }) => itemId).sort(), ['purged', 'tombstoned']);
    assert.deepEqual(store.all().map(({ itemId }) => itemId), ['kept']);
  });
});
