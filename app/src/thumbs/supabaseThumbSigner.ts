import type { SupabaseClient } from '@supabase/supabase-js';
import type { ThumbSigner } from './thumbSync.ts';

const BUCKET = 'media';
/** Long enough to finish a batch of downloads; links are never stored. */
export const SIGNED_URL_SECONDS = 600;

/** One request per batch; Storage RLS signs only the caller's own `{user_id}/…` paths. */
export function createSupabaseThumbSigner(client: SupabaseClient): ThumbSigner {
  return {
    sign: async (paths) => {
      const { data, error } = await client.storage.from(BUCKET).createSignedUrls([...paths], SIGNED_URL_SECONDS);
      if (error) throw new Error(`signing thumbnails failed (${error.name})`);
      return new Map(data.flatMap(({ path, signedUrl, error: itemError }) => (path && signedUrl && !itemError ? [[path, signedUrl] as const] : [])));
    },
  };
}
