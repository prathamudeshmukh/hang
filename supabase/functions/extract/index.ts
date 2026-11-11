import { createClient } from '@supabase/supabase-js';
import { makeDnsLookup } from '../_shared/extraction/net/dnsLookup.ts';
import { makeFetchContext } from '../_shared/extraction/net/fetcher.ts';
import { extract } from '../_shared/extraction/registry.ts';
import { consoleLogger } from './consoleLogger.ts';
import { makeExtractHandler } from './handler.ts';
import { makeSupabaseItemStore } from './supabaseItemStore.ts';
import type { ExtractItem } from './types.ts';

/** The only file that touches Deno globals and env; everything it wires is tested with fakes. */
function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const lookup = makeDnsLookup((hostname, type, options) => Deno.resolveDns(hostname, type, options));

const extractItem: ExtractItem = (item) => {
  const ctx = makeFetchContext(item.sourceUrl, { lookup });
  return extract({ ...ctx, sharedTitle: item.sharedTitle ?? undefined });
};

const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(makeExtractHandler({
  secret: requireEnv('EXTRACT_SECRET'),
  store: makeSupabaseItemStore(client),
  extractItem,
  log: consoleLogger,
}));
