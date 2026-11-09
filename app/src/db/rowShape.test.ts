/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fromServerRow, primaryKeyColumn, toServerShape } from './rowShape.ts';

describe('toServerShape', () => {
  it('renames local fields to server columns', () => {
    const payload = toServerShape('items', { collectionId: 'c1', readAt: '2026-11-09T10:00:00.000Z' });
    assert.deepEqual(payload, { collection_id: 'c1', read_at: '2026-11-09T10:00:00.000Z' });
  });

  it('throws on a field the table does not have', () => {
    assert.throws(() => toServerShape('collections', { sourceUrl: 'x' }), /collections has no field sourceUrl/);
  });
});

describe('fromServerRow', () => {
  it('maps known columns and drops unknown ones such as user_id', () => {
    const row = fromServerRow('item_content', { item_id: 'i1', word_count: 900, user_id: 'u1', extra: true });
    assert.deepEqual(row, { itemId: 'i1', wordCount: 900 });
  });

  it('keeps json columns as values', () => {
    const row = fromServerRow('items', { id: 'i1', tags: ['a', 'b'], palette: { dominant: '#000000' } });
    assert.deepEqual(row, { id: 'i1', tags: ['a', 'b'], palette: { dominant: '#000000' } });
  });
});

describe('primaryKeyColumn', () => {
  it('is item_id for item_content and id elsewhere', () => {
    assert.equal(primaryKeyColumn('item_content'), 'item_id');
    assert.equal(primaryKeyColumn('items'), 'id');
  });
});
