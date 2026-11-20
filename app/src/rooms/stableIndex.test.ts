/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { stableIndex } from './stableIndex.ts';

const IDS = Array.from({ length: 60 }, (_, at) => `0190f1c2-7a3b-7c4d-8e5f-${String(at).padStart(12, '0')}`);

describe('stableIndex', () => {
  it('gives an id the same index every time, within range', () => {
    const indexes = IDS.map((id) => stableIndex(id, 3));
    assert.deepEqual(IDS.map((id) => stableIndex(id, 3)), indexes);
    assert.ok(indexes.every((index) => index >= 0 && index < 3));
  });

  it('spreads ids across every index', () => {
    assert.deepEqual(new Set(IDS.map((id) => stableIndex(id, 3))).size, 3);
  });
});
