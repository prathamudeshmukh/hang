/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseServerRow } from './serverRows.ts';

const ITEM = { id: 'i1', source_url: 'https://a.co', created_at: '2026-11-09T09:00:00+00:00', updated_at: '2026-11-09T09:00:00.1+00:00' };

describe('parseServerRow', () => {
  it('accepts a full item and drops columns we do not mirror', () => {
    const row = parseServerRow('items', { ...ITEM, user_id: 'u1', kind: 'video', tags: ['film'], palette: { dominant: '#111111', muted: '#222222', onDominant: '#ffffff' } });
    assert.equal(row.kind, 'video');
    assert.equal('user_id' in row, false);
  });

  it('rejects an unknown card kind', () => {
    assert.throws(() => parseServerRow('items', { ...ITEM, kind: 'podcast' }), /malformed items row.*kind/i);
  });

  it('rejects a row without updated_at', () => {
    assert.throws(() => parseServerRow('item_content', { item_id: 'i1' }), /malformed item_content row.*updated_at/i);
  });
});
