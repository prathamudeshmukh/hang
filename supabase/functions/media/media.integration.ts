/**
 * Against the local stack; run with `deno task test:integration` (scripts/test-integration.sh), which serves the
 * functions and points Vault at them. Proves image_url update → trigger → Vault → secret → media → Storage → row,
 * and that the SSRF guard holds for images too.
 *
 * The happy path fetches one long-lived public image (network needed, as in CI).
 */
import { createClient } from '@supabase/supabase-js';
import { expect } from '@std/expect';
import { afterAll, beforeAll, describe, it } from '@std/testing/bdd';

const API_URL = Deno.env.get('API_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');
const EXTRACT_SECRET = Deno.env.get('EXTRACT_SECRET');
if (!API_URL || !SERVICE_ROLE_KEY || !EXTRACT_SECRET) {
  throw new Error('API_URL, SERVICE_ROLE_KEY and EXTRACT_SECRET must be set: run `deno task test:integration`');
}

const PUBLIC_IMAGE = 'https://www.google.com/images/branding/googlelogo/2x/googlelogo_color_272x92dp.png';
const PRIVATE_IMAGE = 'http://169.254.169.254/latest/meta-data/';
const POLL_INTERVAL_MS = 250;
const POLL_TIMEOUT_MS = 30_000;

const admin = createClient(API_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

interface MediaRow {
  readonly thumb_path: string | null;
  readonly thumb_w: number | null;
  readonly thumb_h: number | null;
  readonly palette: { dominant: string; muted: string; onDominant: string } | null;
}

async function waitForThumb(id: string): Promise<MediaRow> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const { data, error } = await admin.from('items').select('thumb_path, thumb_w, thumb_h, palette').eq('id', id).single<MediaRow>();
    if (error) throw error;
    if (data.thumb_path) return data;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  throw new Error(`item ${id} got no thumbnail within ${POLL_TIMEOUT_MS} ms`);
}

describe('media against the local stack', () => {
  let userId = '';

  beforeAll(async () => {
    const { data, error } = await admin.auth.admin.createUser({ email: `media-${crypto.randomUUID()}@example.com`, email_confirm: true });
    if (error) throw error;
    userId = data.user.id;
  });

  afterAll(async () => {
    await admin.auth.admin.deleteUser(userId);
  });

  /** A ready item, as extract leaves it, before any image is known. */
  const readyItem = async () => {
    const id = crypto.randomUUID();
    const { error } = await admin.from('items').insert({ id, user_id: userId, source_url: 'https://example.com/', status: 'ready' });
    if (error) throw error;
    return id;
  };

  const setImage = async (id: string, imageUrl: string) => {
    const { error } = await admin.from('items').update({ image_url: imageUrl }).eq('id', id);
    if (error) throw error;
  };

  it('stores a WebP thumbnail under the owner and writes its size and palette', async () => {
    const id = await readyItem();
    await setImage(id, PUBLIC_IMAGE);
    const row = await waitForThumb(id);
    expect(row).toMatchObject({ thumb_path: `${userId}/thumbs/${id}.webp`, thumb_w: 544, thumb_h: 184 });
    expect(row.palette?.dominant).toMatch(/^#[0-9a-f]{6}$/);
    const { data: file, error } = await admin.storage.from('media').download(row.thumb_path ?? '');
    if (error) throw error;
    expect(file.type).toBe('image/webp');
  });

  it('refuses to fetch a private image address and leaves the item as it was', async () => {
    const id = await readyItem();
    await setImage(id, PRIVATE_IMAGE);
    const res = await fetch(`${API_URL}/functions/v1/media`, {
      method: 'POST',
      headers: { authorization: `Bearer ${EXTRACT_SECRET}`, 'content-type': 'application/json' },
      body: JSON.stringify({ item_id: id }),
    });
    expect(await res.json()).toEqual({ outcome: 'fetch_failed' });
    const { data } = await admin.from('items').select('thumb_path').eq('id', id).single<{ thumb_path: string | null }>();
    expect(data?.thumb_path).toBeNull();
  });
});
