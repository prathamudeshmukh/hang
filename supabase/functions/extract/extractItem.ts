import { makeDnsLookup, type ResolveDns } from '../_shared/extraction/net/dnsLookup.ts';
import { makeFetchContext } from '../_shared/extraction/net/fetcher.ts';
import { extract } from '../_shared/extraction/registry.ts';
import type { ExtractItem } from './types.ts';

/** Fetches a claimed item's page behind the SSRF guard and runs the registry over it. */
export function makeExtractItem(resolveDns: ResolveDns): ExtractItem {
  const lookup = makeDnsLookup(resolveDns);
  return (item) => extract({ ...makeFetchContext(item.sourceUrl, { lookup }), sharedTitle: item.sharedTitle ?? undefined });
}
