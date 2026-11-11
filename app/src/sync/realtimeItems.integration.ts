/// <reference types="node" />
/**
 * RLS covers Realtime, not only PostgREST: user A's `items` channel carries A's rows and never B's.
 * Against the local stack; run with `npm run test:integration`.
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, describe, it } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ITEMS_CHANGES } from './realtimeItems.ts';

const API_URL = process.env.API_URL;
const ANON_KEY = process.env.ANON_KEY;
if (!API_URL || !ANON_KEY) throw new Error('API_URL and ANON_KEY must be set: run `npm run test:integration`');

const SUBSCRIBE_TIMEOUT_MS = 10_000;
const EVENT_TIMEOUT_MS = 10_000;
/** After A's own event arrives, how long B's (inserted earlier) still gets to show up if RLS leaked. */
const LEAK_GRACE_MS = 1_500;

const clients: SupabaseClient[] = [];

async function signedInClient(): Promise<SupabaseClient> {
  const client = createClient(API_URL!, ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signUp({ email: `it-${randomUUID()}@example.com`, password: randomUUID() });
  if (error) throw error;
  await client.realtime.setAuth();
  clients.push(client);
  return client;
}

function withTimeout<T>(promise: Promise<T>, ms: number, what: string): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${what}`)), ms))]);
}

/** Subscribes the way the app does and records the ids of the rows each event carries. */
async function listen(client: SupabaseClient) {
  const seen: string[] = [];
  const waiters = new Map<string, () => void>();
  // `SUBSCRIBED` comes before Realtime is attached to Postgres; changes flow only after this system message.
  const subscribed = new Promise<void>((resolve, reject) => {
    client
      .channel(`it-${randomUUID()}`)
      .on('system', {}, (message: { extension?: string; status?: string }) => {
        if (message.extension === 'postgres_changes' && message.status === 'ok') resolve();
      })
      .on('postgres_changes', ITEMS_CHANGES, (payload) => {
        const id = String((payload.new as { id?: string }).id);
        seen.push(id);
        waiters.get(id)?.();
      })
      .subscribe((status, error) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') reject(error ?? new Error(status));
      });
  });
  await withTimeout(subscribed, SUBSCRIBE_TIMEOUT_MS, 'Realtime subscription');
  const eventFor = (id: string) => withTimeout(new Promise<void>((resolve) => waiters.set(id, resolve)), EVENT_TIMEOUT_MS, `event for ${id}`);
  return { seen, eventFor };
}

async function insertItem(client: SupabaseClient): Promise<string> {
  const id = randomUUID();
  const { error } = await client.from('items').insert({ id, source_url: `https://example.com/${id}` });
  if (error) throw error;
  return id;
}

after(async () => {
  await Promise.all(clients.map((client) => client.removeAllChannels()));
});

describe('Realtime on items, against the local stack', () => {
  it("delivers the user's own changes and none of another user's", async () => {
    const alice = await signedInClient();
    const bob = await signedInClient();
    const channel = await listen(alice);

    const bobsItem = await insertItem(bob);
    const alicesItem = await insertItem(alice);
    await channel.eventFor(alicesItem);
    await new Promise((resolve) => setTimeout(resolve, LEAK_GRACE_MS));

    assert.ok(channel.seen.includes(alicesItem));
    assert.ok(!channel.seen.includes(bobsItem), "Bob's insert reached Alice's channel");
  });
});
