import { isIpLiteral, isPrivateAddress } from './addresses.ts';

/** Resolves a hostname to its IP addresses (A and AAAA). */
export type Lookup = (hostname: string, signal?: AbortSignal) => Promise<readonly string[]>;

/**
 * SSRF guard: only public http(s) targets. Checked per redirect hop by the fetcher.
 * Known gap (SPEC §10): DNS can change between this check and the connect (rebinding);
 * Edge Function `fetch` can't pin the resolved IP. Messages never carry the host (SPEC §7).
 */
export async function assertFetchableUrl(url: URL, lookup: Lookup, signal?: AbortSignal): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`unsupported scheme: ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIpLiteral(host) ? [host] : await lookup(host, signal);
  if (addresses.length === 0 || addresses.some(isPrivateAddress)) {
    throw new Error('refusing to fetch: host resolves to a private address');
  }
}
