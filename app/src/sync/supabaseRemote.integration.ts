/// <reference types="node" />
/**
 * Against the local stack (`npx supabase start`); run with `npm run test:integration`, which reads the
 * URL and key from `supabase status`. Each test signs up throwaway users (local email sign-up only).
 */
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createCollectionsRepository } from '../db/collectionsRepository.ts';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { createOutboxRepository } from '../db/outboxRepository.ts';
import { createSqliteSyncStore } from '../db/sqliteSyncStore.ts';
import { createTestDeps } from '../db/testing/testDb.ts';
import { createSyncEngine } from './engine.ts';
import { createSupabaseRemote } from './supabaseRemote.ts';
import { RemoteError } from './types.ts';

const API_URL = process.env.API_URL;
const ANON_KEY = process.env.ANON_KEY;
if (!API_URL || !ANON_KEY) throw new Error('API_URL and ANON_KEY must be set: run `npm run test:integration`');

async function signedInClient(): Promise<SupabaseClient> {
  const client = createClient(API_URL!, ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signUp({ email: `it-${randomUUID()}@example.com`, password: randomUUID() });
  if (error) throw error;
  return client;
}

/** One device: its own SQLite store and engine, talking to Supabase as `client`'s user. */
function device(client: SupabaseClient, pageSize = 200) {
  const deps = createTestDeps();
  return {
    items: createItemsRepository(deps),
    collections: createCollectionsRepository(deps),
    outbox: createOutboxRepository(deps),
    engine: createSyncEngine({
      store: createSqliteSyncStore(deps),
      remote: createSupabaseRemote(client),
      clock: deps.clock,
      options: { pageSize },
    }),
  };
}

describe('supabase remote against the local stack', () => {
  it('round-trips through the server, page by page, to a second device', async () => {
    const alice = await signedInClient();
    const phone = device(alice);
    const collectionId = randomUUID();
    phone.collections.create({ id: collectionId, name: 'Reading' });
    phone.items.save({ id: randomUUID(), sourceUrl: 'https://aeon.co/essays/on-boredom', collectionId });
    phone.items.save({ id: randomUUID(), sourceUrl: 'https://example.com/two' });
    const pushed = await phone.engine.sync();

    const tablet = device(alice, 1);
    const pulled = await tablet.engine.sync();
    assert.equal(pushed.pushed, 3);
    assert.deepEqual(pulled.pulled, { collections: 1, items: 2, item_content: 0 });
    assert.equal(tablet.items.listInCollection(collectionId).length, 1);
  });

  it('applies a patch', async () => {
    const phone = device(await signedInClient());
    const id = randomUUID();
    phone.items.save({ id, sourceUrl: 'https://example.com/read-me' });
    phone.items.markRead(id);
    const report = await phone.engine.sync();
    assert.deepEqual([report.pushed, report.failed], [2, 0]);
    assert.ok(phone.items.getById(id)?.readAt);
  });

  it('rejects, as permanent, a patch that matches no row (PostgREST answers it with success)', async () => {
    const remote = createSupabaseRemote(await signedInClient());
    const push = remote.push({ tableName: 'items', rowId: randomUUID(), op: 'patch', payload: { read_at: null } });
    await assert.rejects(push, (error: unknown) => error instanceof RemoteError && !error.retryable);
  });

  it('keeps users apart: Bob sees none of Alice\'s rows and cannot overwrite them', async () => {
    const aliceClient = await signedInClient();
    const alice = device(aliceClient);
    const id = randomUUID();
    alice.items.save({ id, sourceUrl: 'https://example.com/alice' });
    await alice.engine.sync();

    const bob = device(await signedInClient());
    bob.items.save({ id, sourceUrl: 'https://example.com/bob-hijack' });
    const report = await bob.engine.sync();
    const aliceAgain = device(aliceClient);
    await aliceAgain.engine.sync();
    assert.deepEqual(report.pulled, { collections: 0, items: 0, item_content: 0 });
    assert.equal(aliceAgain.items.getById(id)?.sourceUrl, 'https://example.com/alice');
  });

  it('ignores a create that already reached the server, keeping what the server has', async () => {
    const client = await signedInClient();
    const id = randomUUID();
    await client.from('items').insert({ id, source_url: 'https://example.com/x', title: 'Filled in by extract', status: 'ready' });
    const remote = createSupabaseRemote(client);
    await remote.push({ tableName: 'items', rowId: id, op: 'upsert', payload: { id, source_url: 'https://example.com/x', status: 'pending', title: null } });
    const { data } = await client.from('items').select('title, status').eq('id', id).single();
    assert.deepEqual(data, { title: 'Filled in by extract', status: 'ready' });
  });
});
