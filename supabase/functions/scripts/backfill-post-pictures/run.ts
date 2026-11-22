/**
 * #110: give posts saved without a picture one, now that the mirror keeps video and GIF frames and asks X for its
 * large size (#69).
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-post-pictures/run.ts           # dry run
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-post-pictures/run.ts --apply   # writes
 *
 * Re-extracts each live, ready post that has no thumbnail and writes only `post` and `image_url`; a new `image_url`
 * wakes the media step, which makes the thumbnail. Prints ids and counts only. Safe to run again.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { makeExtractItem } from '../../extract/extractItem.ts';
import { toItemPatch } from '../../extract/itemPatch.ts';
import { failIf, listAll, required } from '../_shared/supabaseScript.ts';
import { type BackfillStore, type PostPicture, type PostWithoutThumbnail, runBackfill } from './backfill.ts';

interface PostRow {
  readonly id: string;
  readonly user_id: string;
  readonly source_url: string;
  readonly shared_title: string | null;
  readonly image_url: string | null;
}

const toPost = (row: PostRow): PostWithoutThumbnail => ({ id: row.id, userId: row.user_id, sourceUrl: row.source_url, sharedTitle: row.shared_title, imageUrl: row.image_url });

function supabaseStore(client: SupabaseClient): BackfillStore {
  return {
    listPostsWithoutThumbnail: async () => {
      const rows = await listAll<PostRow>(
        (from, to) =>
          client
            .from('items')
            .select('id, user_id, source_url, shared_title, image_url')
            .eq('kind', 'post')
            .eq('status', 'ready')
            .is('thumb_path', null)
            .is('deleted_at', null)
            .order('id')
            .range(from, to),
        'post list',
      );
      return rows.map(toPost);
    },
    savePicture: async ({ itemId, post, imageUrl }) => {
      failIf((await client.from('items').update({ post, image_url: imageUrl }).eq('id', itemId)).error, 'save');
    },
  };
}

if (import.meta.main) {
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const extractItem = makeExtractItem((hostname, type, options) => Deno.resolveDns(hostname, type, options));
  await runBackfill({
    store: supabaseStore(client),
    readPicture: async (item): Promise<PostPicture | null> => {
      const patch = toItemPatch(item, (await extractItem(item)).extracted);
      return patch.kind === 'post' && patch.post && patch.image_url ? { itemId: item.id, post: patch.post, imageUrl: patch.image_url } : null;
    },
    apply: Deno.args.includes('--apply'),
    print: console.log,
  });
}
