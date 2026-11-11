import { expect } from '@std/expect';
import { beforeEach, describe, it } from '@std/testing/bdd';
import type { ExtractionResult } from '../_shared/extraction/registry.ts';
import { makeExtractHandler } from './handler.ts';
import type { ClaimedItem, ExtractErrorCode, ItemPatch, ItemStore, LogFields, Logger } from './types.ts';

const SECRET = 'test-secret-value';
const ITEM_ID = '0192f0a1-2b3c-7d4e-8f90-123456789abc';
const CLAIMED: ClaimedItem = { id: ITEM_ID, sourceUrl: 'https://blocked.test/p', sharedTitle: 'Shared headline' };

interface Recorder {
  readonly completed: Array<{ id: string; patch: ItemPatch }>;
  readonly failed: Array<{ id: string; code: ExtractErrorCode }>;
  readonly logs: Array<{ level: string; event: string; fields: LogFields }>;
}

function fakeStore(rec: Recorder, claimed: ClaimedItem | null, completeError?: Error): ItemStore {
  return {
    claim: () => Promise.resolve(claimed),
    complete: (id, patch) => {
      if (completeError) return Promise.reject(completeError);
      rec.completed.push({ id, patch });
      return Promise.resolve();
    },
    fail: (id, code) => {
      rec.failed.push({ id, code });
      return Promise.resolve();
    },
  };
}

function fakeLogger(rec: Recorder): Logger {
  const at = (level: string) => (event: string, fields: LogFields) => rec.logs.push({ level, event, fields });
  return { info: at('info'), warn: at('warn'), error: at('error') };
}

const blockedResult: ExtractionResult = {
  extracted: { kind: 'link', adapter: 'generic', url: 'https://blocked.test/p', title: 'Shared headline', siteName: 'blocked.test' },
  errors: [{ adapter: 'article', message: 'HTTP 403' }],
};

function request(body: unknown, secret = SECRET): Request {
  return new Request('http://fn.test/extract', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('extract handler', () => {
  let rec: Recorder;
  beforeEach(() => {
    rec = { completed: [], failed: [], logs: [] };
  });

  const handler = (claimed: ClaimedItem | null = CLAIMED, opts: { completeError?: Error; result?: ExtractionResult } = {}) =>
    makeExtractHandler({
      secret: SECRET,
      store: fakeStore(rec, claimed, opts.completeError),
      extractItem: () => Promise.resolve(opts.result ?? blockedResult),
      log: fakeLogger(rec),
    });

  it('rejects a call without the shared secret', async () => {
    const res = await handler()(request({ item_id: ITEM_ID }, 'wrong-secret'));
    expect(res.status).toBe(401);
    expect(rec.completed).toEqual([]);
  });

  it('rejects a body without a valid item id', async () => {
    const res = await handler()(request({ item_id: 'not-a-uuid' }));
    expect(res.status).toBe(400);
  });

  it('rejects methods other than POST', async () => {
    const res = await handler()(new Request('http://fn.test/extract', { method: 'GET', headers: { authorization: `Bearer ${SECRET}` } }));
    expect(res.status).toBe(405);
  });

  it('does nothing when the item was already claimed, finished or deleted', async () => {
    const res = await handler(null)(request({ item_id: ITEM_ID }));
    expect(res.status).toBe(200);
    expect([rec.completed, rec.failed]).toEqual([[], []]);
  });

  it('completes a claimed item as ready, even when the page was blocked', async () => {
    const res = await handler()(request({ item_id: ITEM_ID }));
    expect(res.status).toBe(200);
    expect(rec.completed[0]?.patch).toMatchObject({ status: 'ready', kind: 'link', title: 'Shared headline' });
  });

  it('logs adapter errors with the item id and never the url', async () => {
    await handler()(request({ item_id: ITEM_ID }));
    const logged = JSON.stringify(rec.logs);
    expect(logged).toContain(ITEM_ID);
    expect(logged).not.toContain('blocked.test');
  });

  it('marks the item failed with a short code when its own code breaks', async () => {
    const res = await handler(CLAIMED, { completeError: new Error('db down for https://blocked.test/p') })(request({ item_id: ITEM_ID }));
    expect(res.status).toBe(500);
    expect(rec.failed).toEqual([{ id: ITEM_ID, code: 'internal' }]);
    expect(JSON.stringify(rec.logs)).not.toContain('blocked.test');
  });
});
