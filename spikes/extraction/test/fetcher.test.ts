import { describe, expect, it, vi } from 'vitest';
import { makeNodeContext } from '../src/node/fetcher.ts';

const publicLookup = async () => [{ address: '93.184.216.34', family: 4 }];

function response(body: string, init: ResponseInit & { url?: string } = {}): Response {
  return new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...init });
}

describe('makeNodeContext', () => {
  it('fetches the page once and memoises it', async () => {
    const fetchImpl = vi.fn(async () => response('<title>x</title>'));
    const ctx = makeNodeContext('https://a.test/p', { fetchImpl, lookup: publicLookup });
    const [first, second] = await Promise.all([ctx.page(), ctx.page()]);
    expect(first.body).toBe('<title>x</title>');
    expect(second).toBe(first);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it('follows redirects and reports the final url', async () => {
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 301, headers: { location: '/final' } }))
      .mockResolvedValueOnce(response('ok'));
    const page = await makeNodeContext('https://a.test/start', { fetchImpl, lookup: publicLookup }).page();
    expect(page.finalUrl).toBe('https://a.test/final');
    expect(fetchImpl).toHaveBeenLastCalledWith('https://a.test/final', expect.objectContaining({ redirect: 'manual' }));
  });

  it('refuses a redirect into a private network', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/admin' } }));
    const ctx = makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup });
    await expect(ctx.page()).rejects.toThrow(/private/);
  });

  it('rejects bodies over the size cap', async () => {
    const fetchImpl = vi.fn(async () => response('x'.repeat(50)));
    const ctx = makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup, maxBytes: 10 });
    await expect(ctx.page()).rejects.toThrow(/too large/);
  });

  it('does not read the body of non-text responses', async () => {
    const fetchImpl = vi.fn(async () => response('binary', { headers: { 'content-type': 'image/png' } }));
    const page = await makeNodeContext('https://a.test/i.png', { fetchImpl, lookup: publicLookup }).page();
    expect(page).toMatchObject({ contentType: 'image/png', body: '' });
  });

  it('fails on http errors', async () => {
    const fetchImpl = vi.fn(async () => response('nope', { status: 404 }));
    await expect(makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page()).rejects.toThrow(/404/);
  });

  it('parses json responses for fetchJson', async () => {
    const fetchImpl = vi.fn(async () => response('{"title":"t"}', { headers: { 'content-type': 'application/json' } }));
    const ctx = makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup });
    await expect(ctx.fetchJson('https://api.test/x')).resolves.toEqual({ title: 't' });
  });

  it('returns an empty body for an empty text response instead of throwing', async () => {
    const fetchImpl = vi.fn(async () => response(''));
    const page = await makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page();
    expect(page.body).toBe('');
  });

  it('applies one deadline across all redirect hops', async () => {
    const hangUntilAborted = (_url: string, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted by deadline'))));
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: '/slow' } }))
      .mockImplementationOnce(hangUntilAborted);
    const ctx = makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup, timeoutMs: 30 });
    await expect(ctx.page()).rejects.toThrow(/deadline/);
    const [firstHop, secondHop] = fetchImpl.mock.calls.map((call) => (call[1] as RequestInit).signal);
    expect(secondHop).toBe(firstHop);
  });

  it('refuses a redirect to a non-http scheme', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'file:///etc/passwd' } }));
    await expect(makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup }).page()).rejects.toThrow(/scheme/);
  });

  it('gives up after too many redirects', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 302, headers: { location: '/loop' } }));
    const ctx = makeNodeContext('https://a.test/', { fetchImpl, lookup: publicLookup });
    await expect(ctx.page()).rejects.toThrow(/redirects/);
  });
});
