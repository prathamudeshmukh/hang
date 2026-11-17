import { createClient } from '@supabase/supabase-js';
import { consoleLogger } from '../_shared/edge/consoleLogger.ts';
import { makeExtractItem } from './extractItem.ts';
import { makeExtractHandler } from './handler.ts';
import { makeSupabaseItemStore } from './supabaseItemStore.ts';

/** The only file that touches Deno globals and env; everything it wires is tested with fakes. */
function requireEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

const client = createClient(requireEnv('SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

Deno.serve(makeExtractHandler({
  secret: requireEnv('EXTRACT_SECRET'),
  store: makeSupabaseItemStore(client),
  extractItem: makeExtractItem((hostname, type, options) => Deno.resolveDns(hostname, type, options)),
  log: consoleLogger,
}));
