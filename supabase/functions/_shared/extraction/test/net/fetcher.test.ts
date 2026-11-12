import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { makeFetchContext } from '../../net/fetcher.ts';
import { type FetchStep, publicLookup, redirectTo, respond, scriptedFetch } from './fakeFetch.ts';

describe('makeFetchContext', () => {
  it('fetches the page once and memoises it', async () => {
    const { fetchImpl, calls } = scriptedFetch(respond('<title>x</title>'));
    const ctx = makeFetchContext('https://a.test/p', { fetchImpl, lookup: publicLookup });
    const [first, second] = await Promise.all([ctx.page(), ctx.page()]);
    expect(first.body).toBe('<title>x</title>');
    expect(second).toBe(first);
    expect(calls.length).toBe(1);
  });

  it('follows redirects manually and reports the final url', async () => {
    const { fetchImpl, calls } = scriptedFetch(redirectTo('/final'), respond('ok'));
    const page = await makeFetchContext('https://a.test/start', { fetchImpl, lookup: publicLookup }).page();
    expect(page.finalUrl).toBe('https://a.test/final');
    expect(calls.at(-1)?.init?.redirect).toBe('manual');
  });

  it('refuses a redirect into a private network', async () => {
    const { fetchImpl } = scriptedFetch(redirectTo('http://127.0.0.1/admin'));
    await expect(makeFetchContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page()).rejects.toThrow(/private/);
  });

  it('refuses a redirect to a non-http scheme', async () => {
    const { fetchImpl } = scriptedFetch(redirectTo('file:///etc/passwd'));
    await expect(makeFetchContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page()).rejects.toThrow(/scheme/);
  });

  it('gives up after too many redirects', async () => {
    const { fetchImpl } = scriptedFetch(redirectTo('/loop'));
    await expect(makeFetchContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page()).rejects.toThrow(/redirects/);
  });

  it('rejects bodies over the size cap', async () => {
    const { fetchImpl } = scriptedFetch(respond('x'.repeat(50)));
    const ctx = makeFetchContext('https://a.test/', { fetchImpl, lookup: publicLookup, maxBytes: 10 });
    await expect(ctx.page()).rejects.toThrow(/too large/);
  });

  it('does not read the body of non-text responses', async () => {
    const { fetchImpl } = scriptedFetch(respond('binary', { headers: { 'content-type': 'image/png' } }));
    const page = await makeFetchContext('https://a.test/i.png', { fetchImpl, lookup: publicLookup }).page();
    expect(page).toMatchObject({ contentType: 'image/png', body: '' });
  });

  it('fails on http errors without putting the url in the message', async () => {
    const { fetchImpl } = scriptedFetch(respond('nope', { status: 404 }));
    const page = makeFetchContext('https://secret-host.test/', { fetchImpl, lookup: publicLookup }).page();
    await expect(page).rejects.toThrow(/^HTTP 404$/);
  });

  it('returns an empty body for an empty text response', async () => {
    const { fetchImpl } = scriptedFetch(respond(''));
    const page = await makeFetchContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page();
    expect(page.body).toBe('');
  });

  it('parses json responses for fetchJson and rejects other content types', async () => {
    const json = scriptedFetch(respond('{"title":"t"}', { headers: { 'content-type': 'application/json' } }));
    await expect(makeFetchContext('https://a.test/', { fetchImpl: json.fetchImpl, lookup: publicLookup }).fetchJson('https://api.test/x'))
      .resolves.toEqual({ title: 't' });
    const html = scriptedFetch(respond('<p>'));
    await expect(makeFetchContext('https://a.test/', { fetchImpl: html.fetchImpl, lookup: publicLookup }).fetchJson('https://api.test/x'))
      .rejects.toThrow(/expected JSON/);
  });

  it('applies one deadline across all redirect hops', async () => {
    const hangUntilAborted: FetchStep = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted by deadline'))));
    const { fetchImpl, calls } = scriptedFetch(redirectTo('/slow'), hangUntilAborted);
    const ctx = makeFetchContext('https://a.test/', { fetchImpl, lookup: publicLookup, timeoutMs: 30 });
    await expect(ctx.page()).rejects.toThrow(/deadline/);
    expect(calls[1]?.init?.signal).toBe(calls[0]?.init?.signal);
  });
});
