/** Every Supabase request gives up after this long; React Native's fetch never times out on its own. */
export const REQUEST_TIMEOUT_MS = 30_000;

/**
 * A fetch that aborts after `ms`. Bounding each request bounds a sync run, which sign-in and sign-out
 * wait for. supabase-js reports the abort as a network failure (status 0), which the remote retries.
 */
export function fetchWithTimeout(fetchImpl: typeof fetch, ms: number): typeof fetch {
  return async (input, init) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(new Error(`Request timed out after ${ms} ms`)), ms);
    const forwardAbort = () => controller.abort(init?.signal?.reason);
    init?.signal?.addEventListener('abort', forwardAbort);
    try {
      return await fetchImpl(input, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
      init?.signal?.removeEventListener('abort', forwardAbort);
    }
  };
}
