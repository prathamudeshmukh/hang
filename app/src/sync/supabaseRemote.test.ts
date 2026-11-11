/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseRemote } from './supabaseRemote.ts';
import { RemoteError } from './types.ts';

interface Recorded {
  readonly method: string;
  readonly url: URL;
  readonly headers: Headers;
  readonly body: unknown;
}

type Responder = () => Response;

const json = (status: number, body: unknown): Responder => () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
const empty = (status: number): Responder => () => new Response(null, { status });
const offline: Responder = () => {
  throw new TypeError('Network request failed');
};

function setup(respond: Responder = json(200, [])) {
  const requests: Recorded[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
    requests.push({ method: init?.method ?? 'GET', url: new URL(String(input)), headers: new Headers(init?.headers), body });
    return respond();
  };
  const client = createClient('https://hang.example.co', 'publishable-key', {
    global: { fetch },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { requests, remote: createSupabaseRemote(client) };
}

const CURSOR = { updatedAt: '2026-11-09T10:00:00.123456+00:00', id: 'i1' };
const ROW = { id: 'i1', source_url: 'https://aeon.co' };

describe('supabase remote: pull', () => {
  it('reads every row in (updated_at, key) order when there is no cursor', async () => {
    const { requests, remote } = setup(json(200, [ROW]));
    const rows = await remote.pull({ tableName: 'items', after: null, limit: 50 });
    assert.deepEqual(rows, [ROW]);
    assert.equal(requests[0].url.pathname, '/rest/v1/items');
    assert.deepEqual([requests[0].url.searchParams.get('order'), requests[0].url.searchParams.get('limit'), requests[0].url.searchParams.get('or')], ['updated_at.asc,id.asc', '50', null]);
  });

  it('reads rows strictly after the cursor, quoting the timestamp', async () => {
    const { requests, remote } = setup();
    await remote.pull({ tableName: 'items', after: CURSOR, limit: 50 });
    const expected = '(updated_at.gt."2026-11-09T10:00:00.123456+00:00",and(updated_at.eq."2026-11-09T10:00:00.123456+00:00",id.gt."i1"))';
    assert.equal(requests[0].url.searchParams.get('or'), expected);
  });

  it('escapes backslashes and quotes inside quoted values', async () => {
    const { requests, remote } = setup();
    await remote.pull({ tableName: 'items', after: { updatedAt: CURSOR.updatedAt, id: 'a\\"b' }, limit: 1 });
    assert.match(requests[0].url.searchParams.get('or') ?? '', /id\.gt\."a\\\\\\"b"/);
  });

  it('orders item_content by its own key, item_id', async () => {
    const { requests, remote } = setup();
    await remote.pull({ tableName: 'item_content', after: null, limit: 10 });
    assert.equal(requests[0].url.searchParams.get('order'), 'updated_at.asc,item_id.asc');
  });
});

describe('supabase remote: push', () => {
  it('inserts a created row, ignoring a duplicate so a retry cannot overwrite what the server filled in', async () => {
    const { requests, remote } = setup(empty(201));
    await remote.push({ tableName: 'items', rowId: 'i1', op: 'upsert', payload: ROW });
    assert.equal(requests[0].method, 'POST');
    assert.equal(requests[0].url.searchParams.get('on_conflict'), 'id');
    assert.match(requests[0].headers.get('prefer') ?? '', /resolution=ignore-duplicates/);
  });

  it('patches only the given row and columns', async () => {
    const { requests, remote } = setup(json(200, [{ id: 'i1' }]));
    await remote.push({ tableName: 'items', rowId: 'i1', op: 'patch', payload: { read_at: '2026-11-09T10:00:00Z' } });
    assert.equal(requests[0].method, 'PATCH');
    assert.equal(requests[0].url.searchParams.get('id'), 'eq.i1');
    assert.deepEqual(requests[0].body, { read_at: '2026-11-09T10:00:00Z' });
  });

  it('treats a patch that matched no row as permanent', async () => {
    const { remote } = setup(json(200, []));
    const push = remote.push({ tableName: 'items', rowId: 'gone', op: 'patch', payload: { read_at: null } });
    await assert.rejects(push, (error: unknown) => error instanceof RemoteError && !error.retryable);
  });
});

describe('supabase remote: errors', () => {
  const cases: readonly (readonly [string, Responder, boolean])[] = [
    ['a network failure', offline, true],
    ['a 5xx', json(503, { message: 'unavailable' }), true],
    ['a 401 (expired or missing session)', json(401, { code: 'PGRST301', message: 'JWT expired' }), true],
    ['a 429', json(429, { message: 'slow down' }), true],
    ['a 400 (bad payload)', json(400, { code: '22P02', message: 'invalid input' }), false],
    ['a 403 (RLS refused the row)', json(403, { code: '42501', message: 'row-level security' }), false],
    ['a stale schema cache during a deploy (PGRST204)', json(400, { code: 'PGRST204', message: 'column not found in schema cache' }), true],
    ['a table missing from the schema cache (PGRST205)', json(404, { code: 'PGRST205', message: 'table not found in schema cache' }), true],
    ['a response that is not a list of rows', json(200, { unexpected: true }), false],
  ];

  for (const [name, respond, retryable] of cases) {
    it(`marks ${name} as retryable: ${retryable}`, async () => {
      const { remote } = setup(respond);
      const pull = remote.pull({ tableName: 'items', after: null, limit: 1 });
      await assert.rejects(pull, (error: unknown) => error instanceof RemoteError && error.retryable === retryable);
    });
  }
});
