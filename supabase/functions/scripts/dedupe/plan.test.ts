import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { planMerges, type DedupeRow } from './plan.ts';

const LIVE = new Set(['tech', 'personal']);
const row = (id: string, overrides: Partial<DedupeRow> = {}): DedupeRow => ({
  id,
  user_id: 'u1',
  source_url: 'https://aeon.co/a',
  canonical_url: null,
  status: 'ready',
  collection_id: null,
  created_at: '2026-11-01T10:00:00Z',
  updated_at: '2026-11-01T10:00:00Z',
  read_at: null,
  progress: null,
  last_opened_at: null,
  ...overrides,
});

describe('planMerges', () => {
  it('never groups two items only because their redirects landed on the same page', () => {
    const plan = planMerges(LIVE, [
      row('a', { source_url: 'https://news.test/one', canonical_url: 'https://news.test/gdpr' }),
      row('b', { source_url: 'https://news.test/two', canonical_url: 'https://news.test/gdpr', created_at: '2026-11-02T10:00:00Z' }),
    ]);
    expect(plan).toEqual([]);
  });

  it('keeps a copy that was read by the server over an older one that failed, with the older date', () => {
    const [merge] = planMerges(LIVE, [row('a', { status: 'failed' }), row('b', { created_at: '2026-11-04T10:00:00Z' })]);
    expect([merge?.keep, merge?.remove, merge?.patch.created_at]).toEqual(['b', ['a'], '2026-11-01T10:00:00Z']);
  });

  it('ignores a place whose collection was deleted', () => {
    const [merge] = planMerges(LIVE, [row('a'), row('b', { collection_id: 'gone', created_at: '2026-11-02T10:00:00Z' })]);
    expect(merge?.patch).toEqual({});
  });

  it('keeps the oldest copy and removes the rest', () => {
    const plan = planMerges(LIVE, [row('b', { created_at: '2026-11-05T10:00:00Z' }), row('a'), row('c', { source_url: 'https://www.aeon.co/a?utm_source=x' })]);
    expect(plan.map(({ keep, remove }) => [keep, [...remove].sort()])).toEqual([['a', ['b', 'c']]]);
  });

  it('carries over the most-sorted place, any read, the furthest progress and the latest open', () => {
    const [merge] = planMerges(LIVE, [
      row('a'),
      row('b', { collection_id: 'tech', updated_at: '2026-11-02T10:00:00Z', read_at: '2026-11-08T10:00:00Z', progress: 0.4 }),
      row('c', { collection_id: 'personal', updated_at: '2026-11-09T10:00:00Z', progress: 0.9, last_opened_at: '2026-11-10T10:00:00Z' }),
    ]);
    expect(merge?.patch).toEqual({ collection_id: 'personal', read_at: '2026-11-08T10:00:00Z', progress: 0.9, last_opened_at: '2026-11-10T10:00:00Z' });
  });

  it('matches through canonical_url, and never across users', () => {
    const plan = planMerges(LIVE, [
      row('a', { source_url: 'https://bit.ly/x', canonical_url: 'https://aeon.co/a' }),
      row('b', { created_at: '2026-11-02T10:00:00Z' }),
      row('z', { user_id: 'u2' }),
    ]);
    expect(plan.map(({ keep, remove }) => [keep, remove])).toEqual([['a', ['b']]]);
  });

  it('leaves single items alone and patches nothing the survivor already has', () => {
    expect(planMerges(LIVE, [row('a'), row('x', { source_url: 'https://other.test/' })])).toEqual([]);
    expect(planMerges(LIVE, [row('a', { progress: 0.5 }), row('b', { created_at: '2026-11-02T10:00:00Z', progress: 0.2 })])[0]?.patch).toEqual({});
  });
});
