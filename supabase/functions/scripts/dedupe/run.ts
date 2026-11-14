/**
 * #19: merge items that are the same link, saved before the share sheet could tell.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/dedupe/run.ts           # dry run
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/dedupe/run.ts --apply   # writes
 *
 * Keeps each link's oldest copy (with the best place, read, progress and last open of the others) and soft-deletes
 * the rest. Prints ids and counts only. Safe to run again: a clean library plans no merges.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { type DedupeStore, runDedupe } from './dedupe.ts';
import type { DedupeRow } from './plan.ts';

const PAGE = 1000;
const COLUMNS = 'id, user_id, source_url, canonical_url, status, collection_id, created_at, updated_at, read_at, progress, last_opened_at';

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function failIf(error: { code?: string; message?: string } | null, step: string): void {
  if (error) throw new Error(`dedupe ${step} failed (${error.code ?? 'unknown'})`);
}

function supabaseStore(client: SupabaseClient): DedupeStore {
  const items = () => client.from('items');
  return {
    listLive: async () => {
      const rows: DedupeRow[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await items().select(COLUMNS).is('deleted_at', null).order('id').range(from, from + PAGE - 1);
        failIf(error, 'list');
        rows.push(...(data as DedupeRow[]));
        if ((data ?? []).length < PAGE) return rows;
      }
    },
    listLiveCollections: async () => {
      const { data, error } = await client.from('collections').select('id').is('deleted_at', null);
      failIf(error, 'collections');
      return new Set((data ?? []).map(({ id }) => id as string));
    },
    apply: async ({ keep, patch, remove }) => {
      // Touches the survivor even with nothing to patch, to learn it's still live before removing anything.
      const kept = await items().update(Object.keys(patch).length > 0 ? patch : { id: keep }).eq('id', keep).is('deleted_at', null).select('id');
      failIf(kept.error, 'patch');
      if ((kept.data ?? []).length === 0) return false;
      failIf((await items().update({ deleted_at: new Date().toISOString() }).in('id', [...remove]).is('deleted_at', null)).error, 'remove');
      return true;
    },
  };
}

if (import.meta.main) {
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  await runDedupe({ store: supabaseStore(client), apply: Deno.args.includes('--apply'), print: console.log });
}
