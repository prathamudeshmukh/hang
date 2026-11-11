/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { fetchWithTimeout } from './fetchWithTimeout.ts';

/** Never answers, but gives up when its signal aborts, like a real fetch. */
const hanging: typeof fetch = (_input, init) =>
  new Promise((_resolve, reject) => {
    init?.signal?.addEventListener('abort', () => reject(init.signal?.reason));
  });

describe('fetch with timeout', () => {
  it('passes the response through when it arrives in time', async () => {
    const quick: typeof fetch = async () => new Response('ok');
    const response = await fetchWithTimeout(quick, 1000)('https://hang.example.co');
    assert.equal(await response.text(), 'ok');
  });

  it('aborts a request that takes too long', async () => {
    await assert.rejects(fetchWithTimeout(hanging, 5)('https://hang.example.co'), /timed out after 5 ms/);
  });

  it('still honours the caller\'s own abort', async () => {
    const caller = new AbortController();
    const request = fetchWithTimeout(hanging, 1000)('https://hang.example.co', { signal: caller.signal });
    caller.abort(new Error('caller gave up'));
    await assert.rejects(request, /caller gave up/);
  });
});
