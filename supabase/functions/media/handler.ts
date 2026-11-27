import { errorName, readItemRequest, reply, STATUS } from '../_shared/edge/itemRequest.ts';
import { readImageHeader } from './imageHeader.ts';
import { paletteOf } from './palette.ts';
import { makeThumbnail, MAX_PIXELS, type Thumbnail } from './thumbnail.ts';
import type { MediaDeps, MediaPatch, MediaSource } from './types.ts';

/** Why an image was set aside. The item stays a good text card either way (SPEC §2); its `image_url` is cleared. */
type Unusable = 'fetch_failed' | 'not_an_image' | 'too_many_pixels' | 'decode_failed';

const IMAGE_KEY_LENGTH = 12;

/** Named after the image it was made from, so a new image gets a new path and the app knows to fetch it (#107). */
async function thumbPath(source: MediaSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(source.imageUrl));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${source.userId}/thumbs/${source.id}-${hex.slice(0, IMAGE_KEY_LENGTH)}.webp`;
}

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

async function dropUnusable(source: MediaSource, reason: Unusable, deps: MediaDeps): Promise<Response> {
  deps.log.warn('media.unusable', { item_id: source.id, reason });
  try {
    await deps.store.dropImage(source);
    return reply(STATUS.ok, reason);
  } catch (error) {
    deps.log.error('media.failed', { item_id: source.id, error: errorName(error) });
    return reply(STATUS.internal, 'failed');
  }
}

/** A file left behind is only wasted space, so failing to remove it is a warning. */
async function removeUnused(source: MediaSource, path: string, deps: MediaDeps): Promise<void> {
  await attempt(() => deps.storage.remove(path), (error) =>
    deps.log.warn('media.thumb_not_removed', { item_id: source.id, error: errorName(error) }));
}

/** The item now shows the new thumbnail, so the earlier one can go. */
async function removeEarlier(source: MediaSource, newPath: string, deps: MediaDeps): Promise<void> {
  const earlier = source.thumbPath;
  if (earlier && earlier !== newPath) await removeUnused(source, earlier, deps);
}

/** The image changed while this one was being made: the item keeps its thumbnail until the newer run replaces it. */
async function superseded(source: MediaSource, ownPath: string, deps: MediaDeps): Promise<Response> {
  deps.log.info('media.superseded', { item_id: source.id });
  await removeUnused(source, ownPath, deps);
  return reply(STATUS.ok, 'superseded');
}

async function store(source: MediaSource, thumb: Thumbnail, deps: MediaDeps): Promise<Response> {
  const patch: MediaPatch = {
    thumb_path: await thumbPath(source),
    thumb_w: thumb.width,
    thumb_h: thumb.height,
    palette: paletteOf(thumb.rgba),
  };
  const saved = await attempt(async () => {
    await deps.storage.upload(patch.thumb_path, thumb.webp);
    return await deps.store.save(source, patch);
  }, (error) => deps.log.error('media.failed', { item_id: source.id, error: errorName(error) }));
  if (saved === undefined) return reply(STATUS.internal, 'failed');
  if (!saved) return superseded(source, patch.thumb_path, deps);
  deps.log.info('media.stored', { item_id: source.id, width: thumb.width, height: thumb.height });
  await removeEarlier(source, patch.thumb_path, deps);
  return reply(STATUS.ok, 'stored');
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
    return typeof thumb === 'string' ? dropUnusable(source, thumb, deps) : store(source, thumb, deps);
  };
}
