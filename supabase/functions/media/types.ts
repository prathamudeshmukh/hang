import type { Logger } from '../_shared/edge/logger.ts';
import type { Palette } from './palette.ts';

/** A live, ready item that has an image to fetch. */
export interface MediaSource {
  readonly id: string;
  readonly userId: string;
  readonly imageUrl: string;
}

/** The media columns of `items` (SPEC §5). Written only by this function. */
export interface MediaPatch {
  readonly thumb_path: string;
  readonly thumb_w: number;
  readonly thumb_h: number;
  readonly palette: Palette | null;
}

export interface MediaStore {
  /** The item's image source, or null when it's deleted, not ready, or has no `image_url`. */
  readonly load: (id: string) => Promise<MediaSource | null>;
  /** Writes the patch only while `image_url` still matches, so a newer image is never overwritten. */
  readonly save: (source: MediaSource, patch: MediaPatch) => Promise<void>;
  /** Clears an unusable `image_url` and any earlier thumbnail (same guard as save), so the app stops waiting (#34). */
  readonly dropImage: (source: MediaSource) => Promise<void>;
}

export interface ThumbStorage {
  /** Stores (or replaces) a WebP at a path inside the private `media` bucket. */
  readonly upload: (path: string, webp: Uint8Array) => Promise<void>;
}

export type FetchImage = (url: string) => Promise<Uint8Array>;

export interface MediaDeps {
  readonly secret: string;
  readonly store: MediaStore;
  readonly storage: ThumbStorage;
  readonly fetchImage: FetchImage;
  readonly log: Logger;
}

export type { Logger };
