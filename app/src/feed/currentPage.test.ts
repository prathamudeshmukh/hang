/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { shownId } from './currentPage.ts';

const SESSION = ['a', 'b', 'c', 'd'];

describe('shownId', () => {
  it('keeps the page on screen while it is still there', () => {
    assert.equal(shownId(SESSION, ['a', 'c', 'd'], 'c'), 'c');
  });

  it('moves on to the next surviving item when the one on screen is deleted', () => {
    assert.equal(shownId(SESSION, ['a', 'd'], 'b'), 'd');
  });

  it('falls back to the one before when the last item is deleted', () => {
    assert.equal(shownId(SESSION, ['a', 'b'], 'd'), 'b');
  });

  it('is null when nothing is left', () => {
    assert.equal(shownId(SESSION, [], 'b'), null);
  });
});
