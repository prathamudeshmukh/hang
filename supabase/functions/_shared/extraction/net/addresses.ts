/**
 * Pure TS address classification for the SSRF guard. Deno has no node:net BlockList with the
 * spike's semantics, so the ranges are matched here as integers (IPv4) and bigints (IPv6).
 */

type Cidr = readonly [network: string, prefix: number];

/** Everything that isn't ordinary public unicast. */
const PRIVATE_V4: readonly Cidr[] = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8], ['169.254.0.0', 16],
  ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15],
  ['198.51.100.0', 24], ['203.0.113.0', 24], ['224.0.0.0', 3],
];

/** Includes IPv6 forms that can embed an IPv4 address: NAT64 (well-known and local-use), SIIT, 6to4, Teredo, IPv4-compatible. */
const PRIVATE_V6: readonly Cidr[] = [
  ['::', 96], ['64:ff9b::', 96], ['64:ff9b:1::', 48], ['::ffff:0:0:0', 96], ['100::', 64], ['2001::', 32],
  ['2001:db8::', 32], ['2002::', 16], ['fc00::', 7], ['fe80::', 10], ['fec0::', 10], ['ff00::', 8],
];

/** ::ffff:0:0/96 carries a plain IPv4 address, judged by the IPv4 rules. */
const V4_MAPPED: Cidr = ['::ffff:0:0', 96];

const V4_BITS = 32;
const V6_BITS = 128;
const V6_GROUPS = 8;
const V4_OCTET = /^(0|[1-9]\d{0,2})$/;
const V6_GROUP = /^[0-9a-f]{1,4}$/i;
const MAX_OCTET = 255;
const GROUP_BITS = 16n;
const LOW_32 = 0xffff_ffffn;

function parseV4(address: string): bigint | undefined {
  const octets = address.split('.');
  if (octets.length !== 4 || !octets.every((o) => V4_OCTET.test(o) && Number(o) <= MAX_OCTET)) return undefined;
  return octets.reduce((acc, o) => (acc << 8n) | BigInt(o), 0n);
}

/** A trailing dotted quad (::ffff:1.2.3.4) counts as the last two groups. */
function toGroups(part: string): readonly string[] | undefined {
  if (part === '') return [];
  const pieces = part.split(':');
  const last = pieces.at(-1) ?? '';
  if (!last.includes('.')) return pieces;
  const v4 = parseV4(last);
  if (v4 === undefined) return undefined;
  return [...pieces.slice(0, -1), (v4 >> GROUP_BITS).toString(16), (v4 & 0xffffn).toString(16)];
}

function expandV6(address: string): readonly string[] | undefined {
  const halves = address.split('::');
  if (halves.length > 2) return undefined;
  const [head, tail] = [toGroups(halves[0] ?? ''), halves.length === 2 ? toGroups(halves[1] ?? '') : []];
  if (!head || !tail) return undefined;
  const missing = V6_GROUPS - head.length - tail.length;
  if (halves.length === 1 ? missing !== 0 : missing < 1) return undefined;
  return [...head, ...Array<string>(missing).fill('0'), ...tail];
}

function parseV6(address: string): bigint | undefined {
  const groups = expandV6(address);
  if (!groups?.every((g) => V6_GROUP.test(g))) return undefined;
  return groups.reduce((acc, g) => (acc << GROUP_BITS) | BigInt(`0x${g}`), 0n);
}

function inCidr(value: bigint, [network, prefix]: Cidr, bits: number): boolean {
  const base = bits === V4_BITS ? parseV4(network) : parseV6(network);
  const shift = BigInt(bits - prefix);
  return base !== undefined && value >> shift === base >> shift;
}

function formatV4(value: bigint): string {
  return [24n, 16n, 8n, 0n].map((shift) => String((value >> shift) & 0xffn)).join('.');
}

/** True for anything that isn't a public unicast IP literal, including non-IPs. */
export function isPrivateAddress(address: string): boolean {
  const v4 = parseV4(address);
  if (v4 !== undefined) return PRIVATE_V4.some((cidr) => inCidr(v4, cidr, V4_BITS));
  const v6 = parseV6(address);
  if (v6 === undefined) return true;
  if (inCidr(v6, V4_MAPPED, V6_BITS)) return isPrivateAddress(formatV4(v6 & LOW_32));
  return PRIVATE_V6.some((cidr) => inCidr(v6, cidr, V6_BITS));
}

export function isIpLiteral(host: string): boolean {
  return parseV4(host) !== undefined || parseV6(host) !== undefined;
}
