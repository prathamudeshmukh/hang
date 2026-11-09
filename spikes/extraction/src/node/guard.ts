import { lookup as dnsLookup } from 'node:dns/promises';
import { BlockList, isIP } from 'node:net';

/** Everything that isn't ordinary public unicast. */
const PRIVATE_V4 = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
] as const;

/** Includes IPv6 forms that can embed an IPv4 address: NAT64, 6to4, Teredo, IPv4-compatible. */
const PRIVATE_V6 = [
  ['::', 96], ['64:ff9b::', 96], ['2001::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10],
  ['fec0::', 10], ['ff00::', 8],
] as const;

const V4_MAPPED_DOTTED = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i;
/** The URL parser normalises [::ffff:127.0.0.1] to ::ffff:7f00:1. */
const V4_MAPPED_HEX = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i;
const BYTE = 0xff;
const BITS_PER_BYTE = 8;

function buildBlockList(): BlockList {
  const list = new BlockList();
  PRIVATE_V4.forEach(([network, prefix]) => list.addSubnet(network, prefix, 'ipv4'));
  PRIVATE_V6.forEach(([network, prefix]) => list.addSubnet(network, prefix, 'ipv6'));
  return list;
}

const BLOCKED = buildBlockList();

function hexPairToDotted(high: string, low: string): string {
  const words = [parseInt(high, 16), parseInt(low, 16)];
  return words.flatMap((word) => [(word >> BITS_PER_BYTE) & BYTE, word & BYTE]).join('.');
}

/** Explicit unmapping, so the check doesn't rely on BlockList's implicit behaviour (absent in Deno). */
function unmapV4(address: string): string | undefined {
  const dotted = V4_MAPPED_DOTTED.exec(address)?.[1];
  if (dotted) return dotted;
  const hex = V4_MAPPED_HEX.exec(address);
  return hex?.[1] && hex[2] ? hexPairToDotted(hex[1], hex[2]) : undefined;
}

export function isPrivateAddress(address: string): boolean {
  const mapped = unmapV4(address);
  if (mapped) return isPrivateAddress(mapped);
  const family = isIP(address);
  if (family === 0) return true;
  return BLOCKED.check(address, family === 4 ? 'ipv4' : 'ipv6');
}

export interface ResolvedAddress { readonly address: string; readonly family: number }
export type Lookup = (hostname: string) => Promise<readonly ResolvedAddress[]>;

const defaultLookup: Lookup = (hostname) => dnsLookup(hostname, { all: true });

function abortable<T>(promise: Promise<T>, signal: AbortSignal | undefined): Promise<T> {
  if (!signal) return promise;
  signal.throwIfAborted();
  const aborted = new Promise<never>((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(signal.reason), { once: true });
  });
  return Promise.race([promise, aborted]);
}

/**
 * SSRF guard: only public http(s) targets. Checked per redirect hop by the fetcher.
 * Known gap: DNS can change between this check and the connect (rebinding); acceptable
 * for the spike, revisit with a pinned-IP agent in the Edge Function.
 */
export async function assertFetchableUrl(url: URL, lookup: Lookup = defaultLookup, signal?: AbortSignal): Promise<void> {
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error(`unsupported scheme: ${url.protocol}`);
  }
  const host = url.hostname.replace(/^\[|\]$/g, '');
  const addresses = isIP(host) ? [{ address: host, family: isIP(host) }] : await abortable(lookup(host), signal);
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error(`refusing to fetch ${host}: resolves to a private address`);
  }
}
