/**
 * #61: give articles saved before `extract` kept their reader text an `item_content` row.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-content/run.ts           # dry run
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-content/run.ts --apply   # writes
 *
 * Refetches each live, ready article without content and writes only `item_content`; titles, summaries and the rest
 * of the item stay as they are. Prints ids and counts only. Safe to run again: it skips articles that have text.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeExtractItem } from '../../extract/extractItem.ts';
import { toItemContent } from '../../extract/itemContent.ts';
import type { ClaimedItem } from '../../extract/types.ts';
import { failIf, listAll, required } from '../_shared/supabaseScript.ts';
import { type BackfillStore, runBackfill } from './backfill.ts';

interface ArticleRow {
  readonly id: string;
  readonly user_id: string;
  readonly source_url: string;
  readonly shared_title: string | null;
}

function supabaseStore(client: SupabaseClient): BackfillStore {
  return {
    listArticlesWithoutContent: async () => {
      const withText = await listAll<{ item_id: string }>((from, to) => client.from('item_content').select('item_id').order('item_id').range(from, to), 'content list');
      const has = new Set(withText.map(({ item_id }) => item_id));
      const articles = await listAll<ArticleRow>(
        (from, to) =>
          client.from('items').select('id, user_id, source_url, shared_title').eq('kind', 'article').eq('status', 'ready').is('deleted_at', null).order('id').range(from, to),
        'article list',
      );
      return articles
        .filter(({ id }) => !has.has(id))
        .map((row): ClaimedItem => ({ id: row.id, userId: row.user_id, sourceUrl: row.source_url, sharedTitle: row.shared_title }));
    },
    saveContent: async (content) => {
      failIf((await client.from('item_content').upsert(content, { onConflict: 'item_id' })).error, 'save');
    },
  };
}

if (import.meta.main) {
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const extractItem = makeExtractItem((hostname, type, options) => Deno.resolveDns(hostname, type, options));
  await runBackfill({
    store: supabaseStore(client),
    readContent: async (item) => toItemContent(item, (await extractItem(item)).extracted),
    apply: Deno.args.includes('--apply'),
    print: console.log,
  });
}
