import { errorName, readItemRequest, reply, STATUS } from '../_shared/edge/itemRequest.ts';
import { readImageHeader } from './imageHeader.ts';
import { paletteOf } from './palette.ts';
import { makeThumbnail, MAX_PIXELS, type Thumbnail } from './thumbnail.ts';
import type { MediaDeps, MediaPatch, MediaSource } from './types.ts';

/** Why an image was set aside. The item stays a good text card either way (SPEC §2). */
type Unusable = 'fetch_failed' | 'not_an_image' | 'too_many_pixels' | 'decode_failed';

const thumbPath = (source: MediaSource) => `${source.userId}/thumbs/${source.id}.webp`;

async function attempt<T>(work: () => Promise<T>, onError?: (error: unknown) => void): Promise<T | undefined> {
  try {
    return await work();
  } catch (error) {
    onError?.(error);
    return undefined;
  }
}

/** Fetch → check the header before decoding anything → thumbnail. */
async function thumbnailFor(source: MediaSource, deps: MediaDeps): Promise<Thumbnail | Unusable> {
  const bytes = await attempt(() => deps.fetchImage(source.imageUrl));
  if (!bytes) return 'fetch_failed';
  const header = readImageHeader(bytes);
  if (!header) return 'not_an_image';
  if (header.width * header.height > MAX_PIXELS) return 'too_many_pixels';
  return (await attempt(() => makeThumbnail(bytes))) ?? 'decode_failed';
}

async function store(source: MediaSource, thumb: Thumbnail, deps: MediaDeps): Promise<Response> {
  const patch: MediaPatch = {
    thumb_path: thumbPath(source),
    thumb_w: thumb.width,
    thumb_h: thumb.height,
    palette: paletteOf(thumb.rgba),
  };
  try {
    await deps.storage.upload(patch.thumb_path, thumb.webp);
    await deps.store.save(source, patch);
    deps.log.info('media.stored', { item_id: source.id, width: thumb.width, height: thumb.height });
    return reply(STATUS.ok, 'stored');
  } catch (error) {
    deps.log.error('media.failed', { item_id: source.id, error: errorName(error) });
    return reply(STATUS.internal, 'failed');
  }
}

/** POST { item_id } from the `image_url` trigger → thumbnail, size and palette (SPEC §4 media step). */
export function makeMediaHandler(deps: MediaDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    const request = await readItemRequest(req, deps.secret);
    if ('rejection' in request) return request.rejection;
    const source = await attempt(() => deps.store.load(request.itemId), (error) =>
      deps.log.error('media.failed', { item_id: request.itemId, error: errorName(error) }));
    if (source === undefined) return reply(STATUS.internal, 'failed');
    if (!source) {
      deps.log.info('media.skipped', { item_id: request.itemId });
      return reply(STATUS.ok, 'skipped');
    }
    const thumb = await thumbnailFor(source, deps);
    if (typeof thumb === 'string') {
      deps.log.warn('media.unusable', { item_id: source.id, reason: thumb });
      return reply(STATUS.ok, thumb);
    }
    return store(source, thumb, deps);
  };
}
