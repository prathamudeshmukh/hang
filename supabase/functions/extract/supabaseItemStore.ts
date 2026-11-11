import type { SupabaseClient } from '@supabase/supabase-js';
import type { ClaimedItem, ExtractErrorCode, ItemPatch, ItemStore } from './types.ts';

const CLAIMED_COLUMNS = 'id, source_url, shared_title';

interface ClaimedRow {
  readonly id: string;
  readonly source_url: string;
  readonly shared_title: string | null;
}

function throwIfError(result: { error: { code?: string } | null }, step: string): void {
  // PostgREST messages can quote row values, so only the code travels on.
  if (result.error) throw new Error(`items ${step} failed (${result.error.code ?? 'unknown'})`);
}

/** ItemStore over PostgREST with the service-role client; every write is scoped to one id. */
export function makeSupabaseItemStore(client: SupabaseClient): ItemStore {
  const items = () => client.from('items');
  return {
    claim: async (id) => {
      const result = await items()
        .update({ status: 'extracting' })
        .eq('id', id)
        .eq('status', 'pending')
        .is('deleted_at', null)
        .select(CLAIMED_COLUMNS)
        .maybeSingle<ClaimedRow>();
      throwIfError(result, 'claim');
      const row = result.data;
      return row ? ({ id: row.id, sourceUrl: row.source_url, sharedTitle: row.shared_title } satisfies ClaimedItem) : null;
    },
    complete: async (id: string, patch: ItemPatch) => {
      throwIfError(await items().update(patch).eq('id', id).eq('status', 'extracting'), 'complete');
    },
    fail: async (id: string, code: ExtractErrorCode) => {
      throwIfError(await items().update({ status: 'failed', extract_error: code }).eq('id', id), 'fail');
    },
  };
}
