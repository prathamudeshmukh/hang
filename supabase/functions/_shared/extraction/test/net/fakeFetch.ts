import type { Lookup } from '../../net/guard.ts';

export const publicLookup: Lookup = () => Promise.resolve(['93.184.216.34']);

export type FetchStep = (url: string, init?: RequestInit) => Promise<Response>;

interface ScriptedFetch {
  readonly fetchImpl: typeof fetch;
  readonly calls: ReadonlyArray<{ readonly url: string; readonly init?: RequestInit }>;
}

/** Plays the steps in order; the last one repeats. */
export function scriptedFetch(...steps: FetchStep[]): ScriptedFetch {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const fetchImpl = ((input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, init });
    const step = steps[Math.min(calls.length - 1, steps.length - 1)];
    return step ? step(url, init) : Promise.reject(new Error('no step'));
  }) as typeof fetch;
  return { fetchImpl, calls };
}

export const respond = (body: BodyInit | null, init: ResponseInit = {}): FetchStep => () =>
  Promise.resolve(new Response(body, { status: 200, headers: { 'content-type': 'text/html' }, ...init }));

export const redirectTo = (location: string): FetchStep => respond(null, { status: 302, headers: { location } });
