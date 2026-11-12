import { createClient } from '@supabase/supabase-js';
import { consoleLogger } from '../_shared/edge/consoleLogger.ts';
import { makeDnsLookup } from '../_shared/extraction/net/dnsLookup.ts';
import { makeImageFetcher } from '../_shared/extraction/net/fetcher.ts';
import { makeMediaHandler } from './handler.ts';
import { makeSupabaseMediaStore, makeSupabaseThumbStorage } from './supabaseMediaStore.ts';

/** The only file that touches Deno globals and env; everything it wires is tested with fakes. */
function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const lookup = makeDnsLookup((hostname, type, options) => Deno.resolveDns(hostname, type, options));

const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

// One shared secret for every item trigger (Vault `extract_secret`).
Deno.serve(makeMediaHandler({
  secret: requireEnv('EXTRACT_SECRET'),
  store: makeSupabaseMediaStore(client),
  storage: makeSupabaseThumbStorage(client),
  fetchImage: makeImageFetcher({ lookup }),
  log: consoleLogger,
}));
