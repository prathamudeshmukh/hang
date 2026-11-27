/**
 * #107: give YouTube items saved with oEmbed's letterboxed `hqdefault` picture a 16:9 one (`maxresdefault`, else
 * `mqdefault`).
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-youtube-thumbs/run.ts           # dry run
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-youtube-thumbs/run.ts --apply   # writes
 *
 * Writes only `image_url`, and only while the item still has the old address; the new address wakes the media step,
 * which makes the thumbnail at a new path, and the app fetches it on its next sync. Prints ids and counts only.
 * Safe to run again: a changed item no longer matches.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeDnsLookup } from '../../_shared/extraction/net/dnsLookup.ts';
import { makeImageChecker } from '../../_shared/extraction/net/fetcher.ts';
import { failIf, listAll, required } from '../_shared/supabaseScript.ts';
import { type BackfillStore, type LetterboxedItem, runBackfill } from './backfill.ts';

const LETTERBOXED_PATTERN = 'https://i.ytimg.com/vi/%/hqdefault.jpg';

interface ItemRow {
  readonly id: string;
  readonly image_url: string;
}

function supabaseStore(client: SupabaseClient): BackfillStore {
  return {
    listLetterboxed: async () => {
      const rows = await listAll<ItemRow>(
        (from, to) =>
          client
            .from('items')
            .select('id, image_url')
            .like('image_url', LETTERBOXED_PATTERN)
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        'letterboxed list',
      );
      return rows.map((row): LetterboxedItem => ({ id: row.id, imageUrl: row.image_url }));
    },
    savePicture: async ({ itemId, from, imageUrl }) => {
      failIf((await client.from('items').update({ image_url: imageUrl }).eq('id', itemId).eq('image_url', from)).error, 'save');
    },
  };
}

if (import.meta.main) {
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const lookup = makeDnsLookup((hostname, type, options) => Deno.resolveDns(hostname, type, options));
  await runBackfill({
    store: supabaseStore(client),
    imageExists: makeImageChecker({ lookup }),
    apply: Deno.args.includes('--apply'),
    print: console.log,
  });
}
