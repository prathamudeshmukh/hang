/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { thumbJustArrived } from './arrival.ts';

const FILE = 'file:///thumbs/i1.webp';

describe('thumbJustArrived', () => {
  it('is true when the same card goes from no file to a file', () => {
    assert.equal(thumbJustArrived({ id: 'i1', uri: null }, { id: 'i1', uri: FILE }), true);
  });

  it('is false for a card that already had its file when it was drawn', () => {
    assert.equal(thumbJustArrived(null, { id: 'i1', uri: FILE }), false);
    assert.equal(thumbJustArrived({ id: 'i1', uri: FILE }, { id: 'i1', uri: FILE }), false);
  });

  it('is false when a recycled cell starts showing a different card', () => {
    assert.equal(thumbJustArrived({ id: 'i0', uri: null }, { id: 'i1', uri: FILE }), false);
  });

  it('is false while there is still no file', () => {
    assert.equal(thumbJustArrived({ id: 'i1', uri: null }, { id: 'i1', uri: null }), false);
  });
});
