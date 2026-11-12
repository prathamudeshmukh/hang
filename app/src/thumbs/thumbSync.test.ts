/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { items } from '../db/schema.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import type { HangDb } from '../db/types.ts';
import { createThumbStore, type ThumbStore } from './thumbStore.ts';
import { createThumbSync, type ThumbFilesPort, type ThumbSigner, type ThumbSyncDeps } from './thumbSync.ts';

const uriFor = (itemId: string) => `file:///thumbs/${itemId}.webp`;

interface FakeFiles extends ThumbFilesPort {
  readonly onDisk: Set<string>;
  readonly downloads: string[];
  inFlight: number;
  maxInFlight: number;
}

function fakeFiles(failFor: ReadonlySet<string> = new Set()): FakeFiles {
  const files: FakeFiles = {
    onDisk: new Set(),
    downloads: [],
    inFlight: 0,
    maxInFlight: 0,
    uriFor,
    list: () => Promise.resolve([...files.onDisk]),
    download: async (url, uri) => {
      files.inFlight += 1;
      files.maxInFlight = Math.max(files.maxInFlight, files.inFlight);
      await new Promise((resolve) => setTimeout(resolve, 1));
      files.inFlight -= 1;
      if ([...failFor].some((id) => url.includes(id))) throw new Error(`download failed: ${url}`);
      files.downloads.push(uri);
      files.onDisk.add(uri);
    },
    remove: (uri) => (files.onDisk.delete(uri), Promise.resolve()),
  };
  return files;
}

const signer: ThumbSigner = { sign: (paths) => Promise.resolve(new Map(paths.map((path) => [path, `https://signed.test/${path}?token=t`]))) };

function seedReady(db: HangDb, ids: readonly string[]): void {
  ids.forEach((id, i) =>
    db.insert(items).values({ id, sourceUrl: `https://a.test/${id}`, status: 'ready', thumbPath: `u/thumbs/${id}.webp`, createdAt: `2026-11-${10 + i}T00:00:00Z` }).run());
}

describe('thumb sync', () => {
  let db: HangDb;
  let store: ThumbStore;
  let logs: string[];
  const deps = (files: ThumbFilesPort, overrides: Partial<ThumbSyncDeps> = {}): ThumbSyncDeps =>
    ({ store, files, signer, log: (message) => logs.push(message), ...overrides });

  beforeEach(() => {
    db = createTestDeps().db;
    store = createThumbStore(db);
    logs = [];
  });

  it('downloads every missing thumbnail, newest first, at most three at a time', async () => {
    seedReady(db, ['a', 'b', 'c', 'd', 'e']);
    const files = fakeFiles();
    const report = await createThumbSync(deps(files)).run();
    assert.deepEqual(report, { downloaded: 5, failed: 0, removed: 0 });
    assert.deepEqual([files.maxInFlight, files.downloads[0]], [3, uriFor('e')]);
    assert.deepEqual([...store.fileUris().keys()].sort(), ['a', 'b', 'c', 'd', 'e']);
  });

  it('skips a failed download, keeps going, and tries it again next run without logging the url', async () => {
    seedReady(db, ['ok', 'flaky']);
    const first = await createThumbSync(deps(fakeFiles(new Set(['flaky'])))).run();
    const second = await createThumbSync(deps(fakeFiles())).run();
    assert.deepEqual([first, second], [{ downloaded: 1, failed: 1, removed: 0 }, { downloaded: 1, failed: 0, removed: 0 }]);
    assert.equal(logs.some((line) => line.includes('signed.test') || line.includes('a.test')), false);
  });

  it('counts paths the server would not sign as failed', async () => {
    seedReady(db, ['a', 'b']);
    const partial: ThumbSigner = { sign: (paths) => Promise.resolve(new Map(paths.slice(0, 1).map((p) => [p, `https://signed.test/${p}`]))) };
    const report = await createThumbSync(deps(fakeFiles(), { signer: partial })).run();
    assert.deepEqual(report, { downloaded: 1, failed: 1, removed: 0 });
  });

  it('removes files of deleted items and stray files nobody recorded', async () => {
    seedReady(db, ['kept']);
    const files = fakeFiles();
    ['kept', 'purged'].forEach((id) => (store.record(id, uriFor(id)), files.onDisk.add(uriFor(id))));
    files.onDisk.add(uriFor('from-another-account'));
    const report = await createThumbSync(deps(files)).run();
    assert.deepEqual([...files.onDisk], [uriFor('kept')]);
    assert.deepEqual(report, { downloaded: 0, failed: 0, removed: 2 });
  });

  it('runs once at a time; a call during a run gets one follow-up run', async () => {
    seedReady(db, ['a']);
    const files = fakeFiles();
    const thumbs = createThumbSync(deps(files));
    const first = thumbs.run();
    seedReady(db, ['b']);
    const [one, two, three] = await Promise.all([first, thumbs.run(), thumbs.run()]);
    assert.equal(files.downloads.length, 2);
    assert.equal(two, three);
    assert.deepEqual(one.downloaded + two.downloaded, 2);
  });
});
