import type { SupabaseClient } from '@supabase/supabase-js';
import type { MediaPatch, MediaSource, MediaStore, ThumbStorage } from './types.ts';

const BUCKET = 'media';
const WEBP_TYPE = 'image/webp';

interface SourceRow {
  readonly id: string;
  readonly user_id: string;
  readonly image_url: string;
}

function throwIfError(result: { error: { code?: string; name?: string } | null }, step: string): void {
  // PostgREST and Storage messages can quote values, so only the code travels on.
  if (result.error) throw new Error(`media ${step} failed (${result.error.code ?? result.error.name ?? 'unknown'})`);
}

/** MediaStore over PostgREST with the service-role client; every write is scoped to one id. */
export function makeSupabaseMediaStore(client: SupabaseClient): MediaStore {
  const items = () => client.from('items');
  return {
    load: async (id) => {
      const result = await items()
        .select('id, user_id, image_url')
        .eq('id', id)
        .eq('status', 'ready')
        .is('deleted_at', null)
        .not('image_url', 'is', null)
        .maybeSingle<SourceRow>();
      throwIfError(result, 'load');
      const row = result.data;
      return row ? ({ id: row.id, userId: row.user_id, imageUrl: row.image_url } satisfies MediaSource) : null;
    },
    save: async (source: MediaSource, patch: MediaPatch) => {
      throwIfError(await items().update(patch).eq('id', source.id).eq('image_url', source.imageUrl), 'save');
    },
    // Setting it to null never re-fires the media trigger, which only runs for a new non-null address. An earlier
    // image's thumbnail goes too, so the card doesn't keep showing a picture that's no longer the item's.
    dropImage: async (source: MediaSource) => {
      const noImage = { image_url: null, thumb_path: null, thumb_w: null, thumb_h: null, palette: null };
      throwIfError(await items().update(noImage).eq('id', source.id).eq('image_url', source.imageUrl), 'drop');
    },
  };
}

export function makeSupabaseThumbStorage(client: SupabaseClient): ThumbStorage {
  return {
    upload: async (path, webp) => {
      const result = await client.storage.from(BUCKET).upload(path, webp, { contentType: WEBP_TYPE, upsert: true });
      throwIfError(result, 'upload');
    },
  };
}
