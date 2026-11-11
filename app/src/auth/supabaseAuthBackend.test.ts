/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createClient } from '@supabase/supabase-js';
import { createSupabaseAuthBackend } from './supabaseAuthBackend.ts';
import type { AuthUser } from './types.ts';

const USER = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@example.com', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: '2026-11-09T10:00:00Z' };
const SESSION = { access_token: 'access', refresh_token: 'refresh', expires_in: 3600, expires_at: 4102444800, token_type: 'bearer', user: USER };

const STORAGE_KEY = 'hang-session';

/** `tokenResponse` answers /token; a function that throws simulates being offline. */
function setup(tokenResponse: () => Response, stored: Record<string, string> = {}) {
  const paths: string[] = [];
  const fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input));
    paths.push(`${init?.method ?? 'GET'} ${url.pathname}${url.search}`);
    return url.pathname.endsWith('/token') ? tokenResponse() : new Response(null, { status: 204 });
  };
  const memory = new Map(Object.entries(stored));
  const storage = {
    getItem: async (key: string) => memory.get(key) ?? null,
    setItem: async (key: string, value: string) => void memory.set(key, value),
    removeItem: async (key: string) => void memory.delete(key),
  };
  const client = createClient('https://hang.example.co', 'publishable-key', {
    global: { fetch },
    auth: { autoRefreshToken: false, storage, storageKey: STORAGE_KEY },
  });
  return { paths, backend: createSupabaseAuthBackend({ client, storage, storageKey: STORAGE_KEY }) };
}

const offline = (): Response => {
  throw new TypeError('Network request failed');
};
const EXPIRED = JSON.stringify({ ...SESSION, expires_at: 1_700_000_000 });

const ok = () => new Response(JSON.stringify(SESSION), { status: 200, headers: { 'content-type': 'application/json' } });
const rejected = () => new Response(JSON.stringify({ code: 400, error_code: 'bad_jwt', msg: 'Bad ID token' }), { status: 400, headers: { 'content-type': 'application/json' } });

describe('supabase auth backend', () => {
  it('has no user before signing in', async () => {
    assert.equal(await setup(ok).backend.currentUser(), null);
  });

  it('keeps the stored user when the session cannot refresh because the device is offline', async () => {
    const { backend } = setup(offline, { [STORAGE_KEY]: EXPIRED });
    assert.deepEqual(await backend.currentUser(), { id: USER.id, email: USER.email });
  });

  it('has no user when an offline refresh finds no usable stored session', async () => {
    const { backend } = setup(offline, { [STORAGE_KEY]: '{"user":{}}' });
    assert.equal(await backend.currentUser(), null);
  });

  it('exchanges the Google ID token for a session, which then persists', async () => {
    const { backend, paths } = setup(ok);
    const user = await backend.signInWithIdToken('google-jwt');
    assert.deepEqual(user, { id: USER.id, email: USER.email });
    assert.deepEqual(await backend.currentUser(), user);
    assert.equal(paths[0], 'POST /auth/v1/token?grant_type=id_token');
  });

  it('throws when Supabase rejects the token', async () => {
    await assert.rejects(setup(rejected).backend.signInWithIdToken('forged'), /Bad ID token/);
  });

  it('reports the session ending, and forgets it', async () => {
    const { backend } = setup(ok);
    const seen: (AuthUser | null)[] = [];
    await backend.signInWithIdToken('google-jwt');
    backend.onUserChange((user) => seen.push(user));
    await backend.signOut();
    assert.equal(seen.at(-1), null);
    assert.equal(await backend.currentUser(), null);
  });
});
