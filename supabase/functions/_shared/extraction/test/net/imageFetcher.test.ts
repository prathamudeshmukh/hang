import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { makeImageFetcher } from '../../net/fetcher.ts';
import { publicLookup, redirectTo, respond, scriptedFetch } from './fakeFetch.ts';

const IMAGE_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const asImage = (body: BodyInit | null, init: ResponseInit = {}) =>
  respond(body, { headers: { 'content-type': 'image/jpeg' }, ...init });

describe('makeImageFetcher', () => {
  it('returns the body as bytes and asks for images', async () => {
    const { fetchImpl, calls } = scriptedFetch(asImage(IMAGE_BYTES));
    const bytes = await makeImageFetcher({ fetchImpl, lookup: publicLookup })('https://cdn.test/a.jpg');
    expect(bytes).toEqual(IMAGE_BYTES);
    expect(new Headers(calls[0]?.init?.headers).get('accept')).toMatch(/^image\//);
  });

  it('follows a redirect through the guard', async () => {
    const { fetchImpl, calls } = scriptedFetch(redirectTo('/b.jpg'), asImage(IMAGE_BYTES));
    await makeImageFetcher({ fetchImpl, lookup: publicLookup })('https://cdn.test/a.jpg');
    expect(calls.map((call) => call.url)).toEqual(['https://cdn.test/a.jpg', 'https://cdn.test/b.jpg']);
  });

  it('refuses an image that redirects into a private network', async () => {
    const { fetchImpl } = scriptedFetch(redirectTo('http://169.254.169.254/latest'));
    await expect(makeImageFetcher({ fetchImpl, lookup: publicLookup })('https://cdn.test/a.jpg')).rejects.toThrow(/private/);
  });

  it('fails on an error status', async () => {
    const { fetchImpl } = scriptedFetch(asImage('gone', { status: 404 }));
    await expect(makeImageFetcher({ fetchImpl, lookup: publicLookup })('https://cdn.test/a.jpg')).rejects.toThrow(/404/);
  });

  it('stops reading once the body passes the cap', async () => {
    const { fetchImpl } = scriptedFetch(asImage(new Uint8Array(11)));
    const fetchImage = makeImageFetcher({ fetchImpl, lookup: publicLookup, maxBytes: 10 });
    await expect(fetchImage('https://cdn.test/a.jpg')).rejects.toThrow(/too large/);
  });

  it('fails when the deadline passes', async () => {
    const hang = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_, reject) => init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)));
    const { fetchImpl } = scriptedFetch(hang);
    const fetchImage = makeImageFetcher({ fetchImpl, lookup: publicLookup, timeoutMs: 5 });
    await expect(fetchImage('https://cdn.test/a.jpg')).rejects.toThrow(/timed out|abort/i);
  });
});
