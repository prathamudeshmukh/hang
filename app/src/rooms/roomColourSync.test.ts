/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { collections, items, type ItemKind } from '../db/schema.ts';
import { createTestDb } from '../db/testing/testDb.ts';
import type { HangDb } from '../db/types.ts';
import { createRoomColourStore } from './roomColourStore.ts';
import { createRoomColourSync } from './roomColourSync.ts';

const GREEN = '#3f8f4a';
const BLUE = '#2e4a9d';
const WHITE = '#fafafa';

interface Seed {
  readonly id: string;
  readonly collectionId?: string | null;
  readonly dominant?: string;
  readonly vibrant?: string | null;
  readonly kind?: ItemKind;
  readonly day: number;
  readonly deleted?: boolean;
}

describe('room colour sync', () => {
  let db: HangDb;
  const store = () => createRoomColourStore(db);
  const run = () => createRoomColourSync(store()).run();
  const familyOf = (collectionId: string) => store().all().get(collectionId)?.family;

  const collection = (id: string, deleted = false) =>
    db.insert(collections).values({ id, name: id, createdAt: '2026-11-01T00:00:00Z', deletedAt: deleted ? '2026-11-02T00:00:00Z' : null }).run();
  const item = ({ id, collectionId = 'c1', dominant = WHITE, vibrant, kind = 'image', day, deleted = false }: Seed) =>
    db.insert(items).values({
      id,
      collectionId,
      kind,
      status: 'ready',
      sourceUrl: `https://a.test/${id}`,
      palette: { dominant, muted: '#888888', onDominant: '#151D18', ...(vibrant === undefined ? {} : { vibrant }) },
      createdAt: `2026-11-${String(day).padStart(2, '0')}T00:00:00Z`,
      deletedAt: deleted ? '2026-11-19T00:00:00Z' : null,
    }).run();

  beforeEach(() => {
    db = createTestDb();
    collection('c1');
  });

  it('colours a room from its pictures, preferring vibrant over the dominant background', () => {
    item({ id: 'a', vibrant: GREEN, day: 10 });
    item({ id: 'b', dominant: GREEN, day: 9 });
    run();
    assert.equal(familyOf('c1'), 4);
  });

  it('ignores unsorted and deleted items', () => {
    item({ id: 'a', vibrant: GREEN, day: 9 });
    item({ id: 'inbox', collectionId: null, vibrant: BLUE, day: 10 });
    item({ id: 'gone', vibrant: BLUE, day: 11, deleted: true });
    run();
    assert.equal(familyOf('c1'), 4);
  });

  it('keeps the stored family through a close call on the next run', () => {
    item({ id: 'g', vibrant: GREEN, day: 9 });
    run();
    item({ id: 'b1', vibrant: BLUE, day: 10 });
    run();
    assert.equal(familyOf('c1'), 4);
  });

  it('writes nothing when no room changed, so open lists are not woken for nothing', () => {
    item({ id: 'g', vibrant: GREEN, day: 9 });
    run();
    const saves: string[] = [];
    const watched = { ...store(), save: (id: string) => saves.push(id) };
    createRoomColourSync(watched).run();
    assert.deepEqual(saves, []);
  });

  it('gives a room without pictures a colour, and forgets rooms that were deleted', () => {
    collection('gone', true);
    db.insert(items).values({ id: 'text', collectionId: 'c1', sourceUrl: 'https://a.test/t', status: 'ready', createdAt: '2026-11-10T00:00:00Z' }).run();
    run();
    assert.deepEqual([store().all().get('c1')?.family, store().all().has('gone')], [null, false]);
  });
});
