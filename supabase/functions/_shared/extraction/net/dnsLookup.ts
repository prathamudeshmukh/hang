import type { Lookup } from './guard.ts';

export type ResolveDns = (hostname: string, type: 'A' | 'AAAA', options?: { signal?: AbortSignal }) => Promise<string[]>;

const RECORD_TYPES = ['A', 'AAAA'] as const;

/** A host may have only A or only AAAA records; it fails only when both lookups fail. */
export function makeDnsLookup(resolveDns: ResolveDns): Lookup {
  return async (hostname, signal) => {
    const results = await Promise.allSettled(RECORD_TYPES.map((type) => resolveDns(hostname, type, { signal })));
    const fulfilled = results.filter((r): r is PromiseFulfilledResult<string[]> => r.status === 'fulfilled');
    if (fulfilled.length === 0) throw new Error('dns lookup failed');
    return fulfilled.flatMap((r) => r.value);
  };
}
