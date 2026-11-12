import { expect } from '@std/expect';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { Image } from 'imagescript';
import type { LogFields } from '../_shared/edge/logger.ts';
import { makeMediaHandler } from './handler.ts';
import type { MediaDeps, MediaPatch, MediaSource } from './types.ts';

const SECRET = 'media-test-secret';
const ITEM_ID = '0190f1c2-7a3b-7c4d-8e5f-0123456789ab';
const HEX = /^#[0-9a-f]{6}$/;
const SOURCE: MediaSource = { id: ITEM_ID, userId: 'user-1', imageUrl: 'https://cdn.test/private/lead.jpg' };

interface Recorder {
  saved: Array<{ source: MediaSource; patch: MediaPatch }>;
  uploads: Array<{ path: string; size: number }>;
  logs: Array<{ level: string; event: string; fields: LogFields }>;
}

function depsWith(rec: Recorder, overrides: Partial<MediaDeps> = {}): MediaDeps {
  const at = (level: string) => (event: string, fields: LogFields) => rec.logs.push({ level, event, fields });
  return {
    secret: SECRET,
    store: {
      load: () => Promise.resolve(SOURCE),
      save: (source, patch) => (rec.saved.push({ source, patch }), Promise.resolve()),
    },
    storage: { upload: (path, webp) => (rec.uploads.push({ path, size: webp.length }), Promise.resolve()) },
    fetchImage: async () => await new Image(2160, 1080).fill(0x336699ff).encodeJPEG(80),
    log: { info: at('info'), warn: at('warn'), error: at('error') },
    ...overrides,
  };
}

const post = (body: unknown, secret = SECRET) =>
  new Request('http://fn.test/media', {
    method: 'POST',
    headers: { authorization: `Bearer ${secret}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });

const run = (deps: MediaDeps, req = post({ item_id: ITEM_ID })) => makeMediaHandler(deps)(req);
const outcome = async (res: Response) => [res.status, (await res.json()).outcome];

describe('media handler', () => {
  let rec: Recorder;
  beforeEach(() => {
    rec = { saved: [], uploads: [], logs: [] };
  });

  it('stores a 1080-wide WebP under the owner and writes size and palette', async () => {
    const res = await run(depsWith(rec));
    expect(await outcome(res)).toEqual([200, 'stored']);
    expect(rec.uploads.map((u) => u.path)).toEqual([`user-1/thumbs/${ITEM_ID}.webp`]);
    expect(rec.saved[0]?.patch).toEqual({
      thumb_path: `user-1/thumbs/${ITEM_ID}.webp`,
      thumb_w: 1080,
      thumb_h: 540,
      palette: { dominant: expect.stringMatching(HEX), muted: expect.stringMatching(HEX), onDominant: '#F7F5F0' },
    });
  });

  it('rejects a wrong secret and a body without an item id', async () => {
    const results = [await run(depsWith(rec), post({ item_id: ITEM_ID }, 'nope')), await run(depsWith(rec), post({}))];
    expect(await Promise.all(results.map(outcome))).toEqual([[401, 'unauthorized'], [400, 'item_id required']]);
    expect(rec.uploads).toEqual([]);
  });

  it('skips an item that has nothing to fetch', async () => {
    const res = await run(depsWith(rec, { store: { load: () => Promise.resolve(null), save: () => Promise.reject() } }));
    expect(await outcome(res)).toEqual([200, 'skipped']);
  });

  it('leaves the item alone when the image is unusable, and logs why without the url', async () => {
    const svg = new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const huge = await new Image(4000, 2000).fill(0xffffffff).encodeJPEG(10);
    const cases = [
      depsWith(rec, { fetchImage: () => Promise.reject(new TypeError('fetch failed for https://cdn.test/private')) }),
      depsWith(rec, { fetchImage: () => Promise.resolve(svg) }),
      depsWith(rec, { fetchImage: () => Promise.resolve(huge) }),
      // A real PNG signature and IHDR, then garbage: the header passes, the decoder doesn't.
      depsWith(rec, { fetchImage: async () => new Uint8Array([...(await new Image(10, 10).encode()).slice(0, 33), 1, 2, 3]) }),
    ];
    const outcomes = await Promise.all(cases.map(async (deps) => outcome(await run(deps))));
    expect(outcomes).toEqual([[200, 'fetch_failed'], [200, 'not_an_image'], [200, 'too_many_pixels'], [200, 'decode_failed']]);
    expect([rec.saved.length, rec.uploads.length, JSON.stringify(rec.logs).includes('cdn.test')]).toEqual([0, 0, false]);
  });

  it('answers 500 and logs only the error class when the item cannot be loaded', async () => {
    const res = await run(depsWith(rec, { store: { load: () => Promise.reject(new TypeError('db down')), save: () => Promise.reject() } }));
    expect(await outcome(res)).toEqual([500, 'failed']);
    expect(rec.logs.at(-1)?.fields).toEqual({ item_id: ITEM_ID, error: 'TypeError' });
  });

  it('answers 500 when storing fails, so the failure is visible', async () => {
    const res = await run(depsWith(rec, { storage: { upload: () => Promise.reject(new Error('storage down')) } }));
    expect(await outcome(res)).toEqual([500, 'failed']);
    expect(rec.logs.at(-1)).toEqual({ level: 'error', event: 'media.failed', fields: { item_id: ITEM_ID, error: 'Error' } });
  });
});
