/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergePulledRow } from './merge.ts';

const pulled = { id: 'i1', title: 'On boredom', collectionId: 'old', readAt: null, deletedAt: null };

describe('mergePulledRow', () => {
  it('takes every server field when nothing is waiting to be pushed', () => {
    const decision = mergePulledRow(pulled, new Set());
    assert.deepEqual(decision, { kind: 'upsert', insert: pulled, update: pulled });
  });

  it('keeps un-pushed local fields (user fields win) but takes the enrichment', () => {
    const decision = mergePulledRow(pulled, new Set(['collectionId', 'readAt']));
    assert.deepEqual(decision, { kind: 'upsert', insert: pulled, update: { id: 'i1', title: 'On boredom', deletedAt: null } });
  });

  it('purges a tombstone, even over pending local writes', () => {
    const decision = mergePulledRow({ ...pulled, deletedAt: '2026-11-09T10:00:00+00:00' }, new Set(['collectionId']));
    assert.deepEqual(decision, { kind: 'purge' });
  });
});
