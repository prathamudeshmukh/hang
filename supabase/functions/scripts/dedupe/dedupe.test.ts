import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { runDedupe, type DedupeStore } from './dedupe.ts';
import type { DedupeRow, Merge } from './plan.ts';

const row = (id: string, created_at: string, overrides: Partial<DedupeRow> = {}): DedupeRow => ({
  id, user_id: 'u1', source_url: 'https://aeon.co/private-essay', canonical_url: null, status: 'ready', collection_id: null,
  created_at, updated_at: created_at, read_at: null, progress: null, last_opened_at: null, ...overrides,
});

const ROWS = [row('a', '2026-11-01T10:00:00Z'), row('b', '2026-11-02T10:00:00Z', { collection_id: 'tech' })];

function fakeStore() {
  const applied: Merge[] = [];
  const store: DedupeStore = {
    listLive: () => Promise.resolve(ROWS),
    listLiveCollections: () => Promise.resolve(new Set(['tech'])),
    apply: (merge) => (applied.push(merge), Promise.resolve(true)),
  };
  return { store, applied };
}

describe('runDedupe', () => {
  it('only reports on a dry run, by id, without any address', async () => {
    const { store, applied } = fakeStore();
    const lines: string[] = [];
    await runDedupe({ store, apply: false, print: (line) => lines.push(line) });
    expect(applied).toEqual([]);
    expect(lines.join('\n')).toContain('keep a ← b (collection_id)');
    expect(lines.join('\n')).not.toContain('aeon.co');
  });

  it('applies every merge when asked', async () => {
    const { store, applied } = fakeStore();
    await runDedupe({ store, apply: true, print: () => {} });
    expect(applied).toEqual([{ keep: 'a', patch: { collection_id: 'tech' }, remove: ['b'] }]);
  });
});
