/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { items, thumbFiles, type ItemStatus } from '../db/schema.ts';
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

const recordFile = (store: ThumbStore, itemId: string, thumbPath = `u/thumbs/${itemId}.webp`) =>
  store.record({ itemId, fileUri: `file:///thumbs/${itemId}.webp`, thumbPath });

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
    recordFile(store, 'done');
    assert.deepEqual(store.missing(), [
      { itemId: 'new', thumbPath: 'u/thumbs/new.webp', fileUri: null },
      { itemId: 'old', thumbPath: 'u/thumbs/old.webp', fileUri: null },
    ]);
  });

  it('lists an item again when the server made it a new thumbnail, with the file it replaces (#107)', () => {
    seed(db, { id: 'same', createdAt: '2026-11-01T00:00:00Z' });
    seed(db, { id: 'replaced', createdAt: '2026-11-02T00:00:00Z', thumbPath: 'u/thumbs/replaced-abc.webp' });
    ['same', 'replaced'].forEach((id) => recordFile(store, id));
    assert.deepEqual(store.missing(), [
      { itemId: 'replaced', thumbPath: 'u/thumbs/replaced-abc.webp', fileUri: 'file:///thumbs/replaced.webp' },
    ]);
  });

  it('lists a file recorded before paths were kept, so it is fetched once more', () => {
    seed(db, { id: 'a', createdAt: '2026-11-01T00:00:00Z' });
    db.insert(thumbFiles).values({ itemId: 'a', fileUri: 'file:///thumbs/a.webp', thumbPath: null }).run();
    assert.deepEqual(store.missing().map(({ itemId }) => itemId), ['a']);
  });

  it('gives the lists the file of each live item that has one', () => {
    seed(db, { id: 'a', createdAt: '2026-11-01T00:00:00Z' });
    recordFile(store, 'a');
    assert.deepEqual([...store.fileUris()], [['a', 'file:///thumbs/a.webp']]);
  });

  it('gives each collection its newest live pictures, newest first, up to the limit (#106)', () => {
    seed(db, { id: 'oldest', createdAt: '2026-11-01T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'older', createdAt: '2026-11-02T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'newer', createdAt: '2026-11-05T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'newestNoFile', createdAt: '2026-11-09T00:00:00Z', collectionId: 'c1' });
    seed(db, { id: 'gone', createdAt: '2026-11-10T00:00:00Z', collectionId: 'c1', deletedAt: '2026-11-11T00:00:00Z' });
    ['oldest', 'older', 'newer', 'gone'].forEach((id) => recordFile(store, id));
    assert.deepEqual([...store.picturesByCollection(2)], [['c1', ['file:///thumbs/newer.webp', 'file:///thumbs/older.webp']]]);
  });

  it('gives Inbox items no pictures', () => {
    seed(db, { id: 'a', createdAt: '2026-11-01T00:00:00Z' });
    recordFile(store, 'a');
    assert.equal(store.picturesByCollection(3).size, 0);
  });

  it('finds files whose item was deleted or purged, and forgets them', () => {
    seed(db, { id: 'kept', createdAt: '2026-11-01T00:00:00Z' });
    seed(db, { id: 'tombstoned', createdAt: '2026-11-01T00:00:00Z', deletedAt: '2026-11-11T00:00:00Z' });
    ['kept', 'tombstoned', 'purged'].forEach((id) => recordFile(store, id));
    const stale = store.stale();
    store.forget(stale.map(({ itemId }) => itemId));
    assert.deepEqual(stale.map(({ itemId }) => itemId).sort(), ['purged', 'tombstoned']);
    assert.deepEqual(store.all().map(({ itemId }) => itemId), ['kept']);
  });
});
