/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { COULD_NOT_CREATE, tryCreateCollection } from './createCollection.ts';

const warn = () => {};

describe('tryCreateCollection', () => {
  let collections: ReturnType<typeof createCollectionsRepository>;
  beforeEach(() => {
    collections = createCollectionsRepository(createTestDeps());
  });

  it('creates the collection and returns it as a choice', () => {
    const outcome = tryCreateCollection({ collections, warn }, { id: 'c1', name: '  Reading ' });
    assert.deepEqual(outcome, { kind: 'created', choice: { id: 'c1', name: 'Reading' } });
  });

  it('turns a taken name into the message to show', () => {
    collections.create({ id: 'c1', name: 'Reading' });
    const outcome = tryCreateCollection({ collections, warn }, { id: 'c2', name: 'reading' });
    assert.deepEqual(outcome, { kind: 'invalid', message: 'You already have “Reading”' });
  });

  it('logs a store failure and says so plainly, without the raw message', () => {
    const warned: string[][] = [];
    const broken = { create: () => { throw new Error('SQLITE_FULL: database or disk is full'); } };
    const outcome = tryCreateCollection({ collections: broken, warn: (message, detail) => warned.push([message, detail]) }, { id: 'c1', name: 'Reading' });
    assert.deepEqual({ outcome, warned }, {
      outcome: { kind: 'invalid', message: COULD_NOT_CREATE },
      warned: [['Could not create a collection', 'Error: SQLITE_FULL: database or disk is full']],
    });
  });

  it('turns an empty name into the message to show, creating nothing', () => {
    const outcome = tryCreateCollection({ collections, warn }, { id: 'c1', name: '   ' });
    assert.equal(outcome.kind, 'invalid');
    assert.deepEqual(collections.list(), []);
  });
});
