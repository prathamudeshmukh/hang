import type { ExtractContext, FetchedPage } from '../types.ts';
import { assertFetchableUrl, type Lookup } from './guard.ts';

/** SPEC §7: 10 s timeout and a 5 MB body cap on every server-side fetch. */
const DEFAULTS = {
  timeoutMs: 10_000,
  maxBytes: 5 * 1024 * 1024,
  maxRedirects: 5,
  userAgent: 'Mozilla/5.0 (compatible; Hang/0.1; personal link saver)',
  accept: 'text/html,application/json;q=0.9,*/*;q=0.8',
  imageAccept: 'image/webp,image/jpeg,image/png,image/gif;q=0.9',
} as const;

const JSON_TYPE = /json/i;
const TEXTUAL = /^(text\/|application\/(json|xhtml\+xml|xml|ld\+json))/i;

export interface FetcherOptions {
  readonly lookup: Lookup;
  readonly fetchImpl?: typeof fetch;
  readonly maxBytes?: number;
  readonly timeoutMs?: number;
}

type Resolved = Required<FetcherOptions>;

async function readCappedBytes(res: Response, maxBytes: number): Promise<Uint8Array> {
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      received += chunk.value.byteLength;
      if (received > maxBytes) {
        await reader.cancel();
        throw new Error(`response too large (> ${maxBytes} bytes)`);
      }
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  return concatBytes(chunks, received);
}

function concatBytes(chunks: readonly Uint8Array[], length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  chunks.reduce((offset, chunk) => (bytes.set(chunk, offset), offset + chunk.byteLength), 0);
  return bytes;
}

async function readCapped(res: Response, maxBytes: number): Promise<string> {
  return new TextDecoder().decode(await readCappedBytes(res, maxBytes));
}

interface GuardedRequest {
  readonly opts: Resolved;
  readonly signal: AbortSignal;
  readonly accept: string;
}

/**
 * Follows redirects manually so every hop passes the SSRF guard. One signal covers every hop
 * and the body read, so the whole fetch honours a single deadline.
 */
async function guardedFetch(start: string, request: GuardedRequest): Promise<{ res: Response; finalUrl: string }> {
  const { opts, signal, accept } = request;
  let current = new URL(start);
  for (let hop = 0; hop <= DEFAULTS.maxRedirects; hop += 1) {
    await assertFetchableUrl(current, opts.lookup, signal);
    const res = await opts.fetchImpl(current.toString(), {
      redirect: 'manual',
      signal,
      headers: { 'user-agent': DEFAULTS.userAgent, accept },
    });
    const location = res.headers.get('location');
    if (res.status < 300 || res.status >= 400 || !location) return { res, finalUrl: current.toString() };
    await res.body?.cancel();
    current = new URL(location, current);
  }
  throw new Error(`too many redirects (> ${DEFAULTS.maxRedirects})`);
}

async function fetchPage(url: string, opts: Resolved): Promise<FetchedPage> {
  const signal = AbortSignal.timeout(opts.timeoutMs);
  const { res, finalUrl } = await guardedFetch(url, { opts, signal, accept: DEFAULTS.accept });
  if (!res.ok) {
    await res.body?.cancel();
    throw new Error(`HTTP ${res.status}`);
  }
  const contentType = res.headers.get('content-type') ?? '';
  if (!TEXTUAL.test(contentType)) {
    await res.body?.cancel();
    return { finalUrl, status: res.status, contentType, body: '' };
  }
  return { finalUrl, status: res.status, contentType, body: await readCapped(res, opts.maxBytes) };
}

async function fetchJson(url: string, opts: Resolved): Promise<unknown> {
  const page = await fetchPage(url, opts);
  if (!JSON_TYPE.test(page.contentType)) throw new Error(`expected JSON, got ${page.contentType || 'no content type'}`);
  return JSON.parse(page.body) as unknown;
}

function resolve(options: FetcherOptions): Resolved {
  return {
    lookup: options.lookup,
    fetchImpl: options.fetchImpl ?? fetch,
    maxBytes: options.maxBytes ?? DEFAULTS.maxBytes,
    timeoutMs: options.timeoutMs ?? DEFAULTS.timeoutMs,
  };
}

/** The ExtractContext adapters see: guarded, capped, and with the shared page fetched once. */
export function makeFetchContext(url: string, options: FetcherOptions): ExtractContext {
  const opts = resolve(options);
  let pagePromise: Promise<FetchedPage> | undefined;
  return {
    url: new URL(url),
    page: () => (pagePromise ??= fetchPage(url, opts)),
    fetchJson: (jsonUrl) => fetchJson(jsonUrl, opts),
  };
}

/** Same guard, cap and single deadline as pages, but returns raw bytes (SPEC §4 media step). */
export function makeImageFetcher(options: FetcherOptions): (url: string) => Promise<Uint8Array> {
  const opts = resolve(options);
  return async (url) => {
    const signal = AbortSignal.timeout(opts.timeoutMs);
    const { res } = await guardedFetch(url, { opts, signal, accept: DEFAULTS.imageAccept });
    if (!res.ok) {
      await res.body?.cancel();
      throw new Error(`HTTP ${res.status}`);
    }
    return readCappedBytes(res, opts.maxBytes);
  };
}
