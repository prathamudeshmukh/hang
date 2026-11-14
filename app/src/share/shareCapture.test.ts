/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { createOutboxRepository } from '../db/outboxRepository.ts';
import { collections } from '../db/schema.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import type { ParsedShare } from './parseShare.ts';
import { createShareCapture, type ShareCaptureDeps } from './shareCapture.ts';

const LINK: ParsedShare = { kind: 'link', url: 'https://aeon.co/essays/on-boredom', sharedTitle: 'On boredom' };

interface LoggedLine {
  readonly level: 'warn' | 'error';
  readonly message: string;
  readonly detail: string;
}

function setup(overrides: Partial<ShareCaptureDeps> = {}) {
  const deps = createTestDeps();
  const collections = createCollectionsRepository(deps);
  const items = createItemsRepository(deps);
  const outbox = createOutboxRepository(deps);
  const logged: LoggedLine[] = [];
  let pushes = 0;
  let nextId = 0;
  const capture = createShareCapture({
    ready: () => Promise.resolve(),
    items,
    collections,
    newId: () => `id-${++nextId}`,
    thumbs: { fileUris: () => new Map([['old', 'file:///thumbs/old.webp']]) },
    push: () => {
      pushes += 1;
      return Promise.resolve();
    },
    logger: {
      warn: (message, detail) => logged.push({ level: 'warn', message, detail }),
      error: (message, detail) => logged.push({ level: 'error', message, detail }),
    },
    ...overrides,
  });
  return { capture, collections, items, outbox, logged, deps, pushCount: () => pushes };
}

describe('share capture: opening the sheet', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
  });

  it('saves a shared link to the Inbox before the user picks anything', async () => {
    const opening = await s.capture.open(LINK);
    assert.equal(opening.kind, 'saved');
    const saved = s.items.listInbox();
    assert.deepEqual(saved.map((item) => [item.id, item.sourceUrl, item.sharedTitle, item.status]), [
      ['id-1', LINK.url, 'On boredom', 'pending'],
    ]);
  });

  it('queues the new item for the server', async () => {
    await s.capture.open(LINK);
    assert.deepEqual(s.outbox.list().map((entry) => [entry.tableName, entry.rowId, entry.op]), [['items', 'id-1', 'upsert']]);
  });

  it('saves once even if the sheet opens the same capture twice', async () => {
    const [first, second] = await Promise.all([s.capture.open(LINK), s.capture.open(LINK)]);
    assert.deepEqual(second, first);
    assert.equal(s.items.listInbox().length, 1);
  });

  it('offers the live collections in Home order', async () => {
    s.collections.create({ id: 'c1', name: 'Reading' });
    s.collections.create({ id: 'c2', name: 'Watch' });
    const opening = await s.capture.open(LINK);
    assert.deepEqual(opening, { kind: 'saved', itemId: 'id-1', collections: [{ id: 'c1', name: 'Reading' }, { id: 'c2', name: 'Watch' }] });
  });

  it('offers no collections on a device that has none', async () => {
    const opening = await s.capture.open(LINK);
    assert.deepEqual(opening, { kind: 'saved', itemId: 'id-1', collections: [] });
  });

  it('waits for the database to be ready before writing', async () => {
    const order: string[] = [];
    const late = setup({
      ready: async () => {
        await Promise.resolve();
        order.push('ready');
      },
      newId: () => {
        order.push('write');
        return 'id-1';
      },
    });
    await late.capture.open(LINK);
    assert.deepEqual(order, ['ready', 'write']);
  });

  it('does not save a shared image yet', async () => {
    const opening = await s.capture.open({ kind: 'image', imageUri: 'content://media/1' });
    assert.deepEqual(opening, { kind: 'notSaved', reason: 'image' });
    assert.equal(s.outbox.list().length, 0);
  });

  it('does not save a share without a link', async () => {
    const opening = await s.capture.open({ kind: 'unsupported', sharedTitle: 'just words' });
    assert.deepEqual(opening, { kind: 'notSaved', reason: 'unsupported' });
    assert.equal(s.items.listInbox().length, 0);
  });
});

describe('share capture: failures on open', () => {
  it('reports a link the store rejects, without writing or logging the URL', async () => {
    const s = setup();
    const url = `https://example.com/${'x'.repeat(5000)}`;
    const opening = await s.capture.open({ kind: 'link', url });
    assert.equal(opening.kind, 'failed');
    assert.equal(s.outbox.list().length, 0);
    assert.ok(s.logged.every((line) => !line.detail.includes(url) && !line.message.includes(url)));
  });

  it('reports a database that could not be prepared, logging the cause', async () => {
    const s = setup({ ready: () => Promise.reject(new Error('migration 0004 failed')) });
    const opening = await s.capture.open(LINK);
    assert.deepEqual(opening, { kind: 'failed' });
    assert.deepEqual(s.logged, [{ level: 'error', message: 'Could not save a share', detail: 'Error: migration 0004 failed' }]);
  });

  it('redacts the URL from a store error before logging it', async () => {
    const leaky = {
      save: () => { throw new Error(`Failed query: insert … params: ${LINK.url}`); },
      file: () => undefined,
      listLinks: () => [],
      getById: () => undefined,
    };
    const s = setup({ items: leaky });
    await s.capture.open(LINK);
    assert.deepEqual(s.logged.map((line) => line.detail), ['Error: Failed query: insert … params: <url>']);
  });
});

describe('share capture: closing the sheet', () => {
  let s: ReturnType<typeof setup>;
  beforeEach(() => {
    s = setup();
    s.collections.create({ id: 'c1', name: 'Reading' });
  });

  it('Save files the item into the chosen collection and queues the change', async () => {
    await s.capture.open(LINK);
    s.capture.file('id-1', 'c1');
    assert.equal(s.items.getById('id-1')?.collectionId, 'c1');
    assert.deepEqual(s.outbox.list().map((entry) => entry.op), ['upsert', 'upsert', 'patch']);
  });

  it('swiping down leaves the item in the Inbox with nothing more queued', async () => {
    await s.capture.open(LINK);
    const queued = s.outbox.list().length;
    await s.capture.close();
    assert.deepEqual(s.items.listInbox().map((item) => item.id), ['id-1']);
    assert.equal(s.outbox.list().length, queued);
  });

  it('a Save that cannot file the item leaves it in the Inbox and logs a warning', async () => {
    await s.capture.open(LINK);
    s.capture.file('id-1', 'deleted-collection');
    assert.deepEqual(s.items.listInbox().map((item) => item.id), ['id-1']);
    assert.deepEqual(s.logged.map((line) => line.level), ['warn']);
  });

  it('pushes once the sheet closes after a save', async () => {
    await s.capture.open(LINK);
    await s.capture.close();
    assert.equal(s.pushCount(), 1);
  });

  it('pushes even when the sheet closes before the save has finished', async () => {
    const opening = s.capture.open(LINK);
    const closing = s.capture.close();
    await Promise.all([opening, closing]);
    assert.equal(s.pushCount(), 1);
  });

  it('does not push when nothing was saved', async () => {
    await s.capture.open({ kind: 'unsupported' });
    await s.capture.close();
    assert.equal(s.pushCount(), 0);
  });

  it('does not push when the sheet closes without opening a share', async () => {
    await s.capture.close();
    assert.equal(s.pushCount(), 0);
  });

  it('a push that fails is logged and the item stays queued', async () => {
    const failing = setup({ push: () => Promise.reject(new Error('offline')) });
    await failing.capture.open(LINK);
    await failing.capture.close();
    assert.deepEqual(failing.logged.map((line) => line.message), ['Push after share failed']);
    assert.equal(failing.outbox.list().length, 1);
  });
});

describe('share capture: a link Hang already has (#19)', () => {
  let s: ReturnType<typeof setup>;
  const AGAIN: ParsedShare = { kind: 'link', url: 'https://www.aeon.co/essays/on-boredom/?utm_source=twitter' };
  beforeEach(() => {
    s = setup();
    s.items.save({ id: 'old', sourceUrl: LINK.url ?? '' });
  });

  it('opens on the item already saved instead of saving a second copy', async () => {
    const opening = await s.capture.open(AGAIN);
    assert.equal(opening.kind === 'existing' && opening.item.id, 'old');
    assert.equal(s.items.listInbox().length, 1);
  });

  it('queues nothing new for the server', async () => {
    const queued = s.outbox.list().length;
    await s.capture.open(AGAIN);
    assert.equal(s.outbox.list().length, queued);
  });

  it('says where it hangs, since when, whether it was read, and brings its print', async () => {
    s.collections.create({ id: 'c1', name: 'Tech' });
    s.items.file('old', 'c1');
    s.items.markRead('old');
    const opening = await s.capture.open(AGAIN);
    assert.ok(opening.kind === 'existing');
    const { place, createdAt, readAt, thumbUri } = opening.item;
    assert.deepEqual({ place, hasDates: Boolean(createdAt && readAt), thumbUri }, {
      place: { id: 'c1', name: 'Tech' },
      hasDates: true,
      thumbUri: 'file:///thumbs/old.webp',
    });
  });

  it('saves a fresh copy when the earlier one sits in a deleted collection, where nothing shows it (#15)', async () => {
    s.collections.create({ id: 'c1', name: 'Tech' });
    s.items.file('old', 'c1');
    s.deps.db.update(collections).set({ deletedAt: '2026-11-10T10:00:00.000Z' }).run();
    const opening = await s.capture.open(AGAIN);
    assert.equal(opening.kind, 'saved');
  });

  it('saves a fresh copy when the earlier one was deleted', async () => {
    s.items.remove('old');
    const opening = await s.capture.open(AGAIN);
    assert.equal(opening.kind, 'saved');
  });
});
