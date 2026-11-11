/**
 * Against the local stack; run with `deno task test:integration` (scripts/test-integration.sh), which
 * serves the function and points Vault at it. Proves insert → trigger → Vault → secret → claim → write,
 * and that the SSRF guard holds live: a private address degrades to a `ready` link card.
 */
import { createClient } from '@supabase/supabase-js';
import { expect } from '@std/expect';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';

const API_URL = Deno.env.get('API_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
if (!API_URL || !SERVICE_ROLE_KEY) throw new Error('API_URL and SERVICE_ROLE_KEY must be set: run `deno task test:integration`');

const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 30_000;
/** Private targets: the guard must refuse them before any request leaves the function. */
const PRIVATE_URL = 'http://127.0.0.1:9/secret-path';
const METADATA_URL = 'http://169.254.169.254/latest/meta-data/';

const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

interface ItemRow {
  readonly status: string;
  readonly kind: string | null;
  readonly adapter: string | null;
  readonly title: string | null;
  readonly site_name: string | null;
}

async function waitUntilSettled(id: string): Promise<ItemRow> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { data, error } = await admin.from('items').select('status, kind, adapter, title, site_name').eq('id', id).single<ItemRow>();
    if (error) throw error;
    if (data.status === 'ready' || data.status === 'failed') return data;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`item ${id} did not settle within ${POLL_TIMEOUT_MS} ms`);
}

describe('extract against the local stack', () => {
  let userId = '';

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({ email: `extract-${crypto.randomUUID()}@example.com`, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
  });

  const insertItem = async (sourceUrl: string, sharedTitle: string | null) => {
    const id = crypto.randomUUID();
    const { error } = await admin.from('items').insert({ id, user_id: userId, source_url: sourceUrl, shared_title: sharedTitle });
    if (error) throw error;
    return id;
  };

  it('turns a pending item ready, titled by its shared title, without fetching a private address', async () => {
    const row = await waitUntilSettled(await insertItem(PRIVATE_URL, 'Local headline'));
    expect(row).toMatchObject({ status: 'ready', kind: 'link', adapter: 'generic', title: 'Local headline' });
  });

  it('falls back to the host as the title when the share had none', async () => {
    const row = await waitUntilSettled(await insertItem(METADATA_URL, null));
    expect(row).toMatchObject({ status: 'ready', title: '169.254.169.254', site_name: '169.254.169.254' });
  });

  it('refuses a caller without the shared secret', async () => {
    const res = await fetch(`${API_URL}/functions/v1/extract`, {
      method: 'POST',
      headers: { authorization: 'Bearer not-the-secret', 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: crypto.randomUUID() }),
    });
    await res.body?.cancel();
    expect(res.status).toBe(401);
  });
});
