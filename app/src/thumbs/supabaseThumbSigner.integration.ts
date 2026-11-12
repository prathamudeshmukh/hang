/// <reference types="node" />
/**
 * Against the local stack; run with `npm run test:integration`. Proves the signer hands out working links for
 * the caller's own thumbnails only (Storage RLS on the private `media` bucket).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseThumbSigner } from './supabaseThumbSigner.ts';

const API_URL = process.env.API_URL;
const ANON_KEY = process.env.ANON_KEY;
if (!API_URL || !ANON_KEY) throw new Error('API_URL and ANON_KEY must be set: run `npm run test:integration`');

const WEBP_BYTES = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

async function signedInUser(): Promise<{ client: SupabaseClient; userId: string }> {
  const client = createClient(API_URL!, ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signUp({ email: `it-${randomUUID()}@example.com`, password: randomUUID() });
  if (error || !data.user) throw error ?? new Error('no user');
  return { client, userId: data.user.id };
}

/** Uploads as the owner (RLS allows writes under one's own folder), as `media` does with the service role. */
async function ownThumb(user: { client: SupabaseClient; userId: string }): Promise<string> {
  const path = `${user.userId}/thumbs/${randomUUID()}.webp`;
  const { error } = await user.client.storage.from('media').upload(path, WEBP_BYTES, { contentType: 'image/webp' });
  if (error) throw error;
  return path;
}

describe('supabase thumb signer', () => {
  it('signs the caller\'s own thumbnail with a link that downloads it', async () => {
    const alice = await signedInUser();
    const path = await ownThumb(alice);
    const urls = await createSupabaseThumbSigner(alice.client).sign([path]);
    const res = await fetch(urls.get(path)!);
    assert.deepEqual([res.status, new Uint8Array(await res.arrayBuffer())], [200, WEBP_BYTES]);
  });

  it('leaves out another user\'s thumbnail', async () => {
    const [alice, bob] = await Promise.all([signedInUser(), signedInUser()]);
    const bobsPath = await ownThumb(bob);
    const urls = await createSupabaseThumbSigner(alice.client).sign([bobsPath]).catch(() => new Map<string, string>());
    assert.equal(urls.has(bobsPath), false);
  });
});
