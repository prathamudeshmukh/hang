/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { findSameLink, type LinkRow } from './sameLink.ts';

const row = (id: string, sourceUrl: string, overrides: Partial<LinkRow> = {}): LinkRow => ({
  id,
  sourceUrl,
  canonicalUrl: null,
  createdAt: '2026-11-03T10:00:00.000Z',
  ...overrides,
});

describe('findSameLink', () => {
  it('finds an item shared before with different tracking and host spelling', () => {
    const rows = [row('a', 'https://www.aeon.co/essays/on-boredom?utm_source=twitter')];
    assert.equal(findSameLink(rows, 'https://aeon.co/essays/on-boredom/')?.id, 'a');
  });

  it('finds an item through the address the server settled on', () => {
    const rows = [row('a', 'https://bit.ly/3xyz', { canonicalUrl: 'https://aeon.co/essays/on-boredom' })];
    assert.equal(findSameLink(rows, 'https://aeon.co/essays/on-boredom?fbclid=1')?.id, 'a');
  });

  it('picks the oldest when there are already several copies', () => {
    const rows = [
      row('newer', 'https://aeon.co/a', { createdAt: '2026-11-05T10:00:00.000Z' }),
      row('older', 'https://aeon.co/a', { createdAt: '2026-11-01T10:00:00.000Z' }),
    ];
    assert.equal(findSameLink(rows, 'https://aeon.co/a')?.id, 'older');
  });

  it('finds nothing for a different page or something that is not a web link', () => {
    const rows = [row('a', 'https://aeon.co/a?id=1')];
    assert.deepEqual([findSameLink(rows, 'https://aeon.co/a?id=2'), findSameLink(rows, 'not a link')], [null, null]);
  });
});
