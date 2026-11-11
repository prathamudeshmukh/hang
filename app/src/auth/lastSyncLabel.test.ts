/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { lastSyncLabel } from './lastSyncLabel.ts';
import { EMPTY_REPORT } from './testing/fakes.ts';

describe('last sync label', () => {
  it('says when nothing has synced yet', () => {
    assert.equal(lastSyncLabel({ kind: 'never' }), 'Not synced yet');
  });

  it('counts what went each way, and flags failures and retries', () => {
    const report = { ...EMPTY_REPORT, pushed: 2, failed: 1, waiting: true, pulled: { collections: 1, items: 3, item_content: 0 } };
    assert.equal(lastSyncLabel({ kind: 'ok', report }), 'Synced: sent 2 · received 4 · 1 failed · retrying soon');
  });

  it('shows the error of a failed sync', () => {
    assert.equal(lastSyncLabel({ kind: 'error', message: 'offline' }), 'Last sync failed: offline');
  });
});
