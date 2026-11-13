/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { moveChoices, placeName } from './moveChoices.ts';

const COLLECTIONS = [{ id: 'c1', name: 'Reading' }, { id: 'c2', name: 'Recipes' }] as const;

describe('moveChoices', () => {
  it('offers every collection in Home order, then the Inbox', () => {
    assert.deepEqual(moveChoices(COLLECTIONS), [...COLLECTIONS, { id: null, name: 'Inbox' }]);
  });

  it('still offers the Inbox when there are no collections', () => {
    assert.deepEqual(moveChoices([]), [{ id: null, name: 'Inbox' }]);
  });
});

describe('placeName', () => {
  it('names a collection, or the Inbox for none', () => {
    assert.deepEqual([placeName(COLLECTIONS, 'c2'), placeName(COLLECTIONS, null)], ['Recipes', 'Inbox']);
  });

  it('is null for a collection that is no longer on the device', () => {
    assert.equal(placeName(COLLECTIONS, 'gone'), null);
  });
});
