import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { makeFetchContext, makeImageChecker } from '../../net/fetcher.ts';
import { publicLookup, redirectTo, respond, scriptedFetch } from './fakeFetch.ts';

const PAGE = 'https://www.youtube.com/watch?v=abc';
const IMAGE = 'https://i.ytimg.com/vi/abc/maxresdefault.jpg';
const contextWith = (fetchImpl: typeof fetch) => makeFetchContext(PAGE, { fetchImpl, lookup: publicLookup });

describe('imageExists', () => {
  it('asks with HEAD and says yes on a success status', async () => {
    const { fetchImpl, calls } = scriptedFetch(respond(null, { status: 200 }));
    expect(await contextWith(fetchImpl).imageExists(IMAGE)).toBe(true);
    expect(calls[0]?.init?.method).toBe('HEAD');
  });

  it('says no on a missing image', async () => {
    const { fetchImpl } = scriptedFetch(respond(null, { status: 404 }));
    expect(await contextWith(fetchImpl).imageExists(IMAGE)).toBe(false);
  });

  it('is available on its own for scripts', async () => {
    const { fetchImpl } = scriptedFetch(respond(null, { status: 200 }));
    expect(await makeImageChecker({ fetchImpl, lookup: publicLookup })(IMAGE)).toBe(true);
  });

  it('follows redirects through the guard', async () => {
    const { fetchImpl } = scriptedFetch(redirectTo('http://169.254.169.254/latest'));
    await expect(contextWith(fetchImpl).imageExists(IMAGE)).rejects.toThrow(/private/);
  });
});
