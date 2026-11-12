import { decode, Image } from 'imagescript';

export const THUMB_WIDTH = 1080;
/** Matches the header check in the handler; the decoder enforces it again in case a header lies. */
export const MAX_PIXELS = 6_000_000;
// Lossy alpha: a lossless alpha plane made a transparent 1.5 MP PNG take 7–13× longer to encode and blow the
// hosted CPU limit (spikes/media/RESULTS.md). Transparency is kept so logos sit right on both walls.
const WEBP = { quality: 80, alphaQuality: 50 } as const;

export interface Thumbnail {
  readonly webp: Uint8Array;
  readonly width: number;
  readonly height: number;
  /** The thumbnail's RGBA pixels, for the palette. */
  readonly rgba: Uint8Array;
}

async function firstFrame(bytes: Uint8Array): Promise<Image> {
  const decoded = await decode(bytes, { maxPixels: MAX_PIXELS, onlyFirstFrame: true });
  const frame = decoded instanceof Image ? decoded : decoded[0];
  if (!frame) throw new Error('image has no frames');
  return frame;
}

/** Decode → shrink to THUMB_WIDTH (never enlarge) → lossy WebP (SPEC §4 media step). */
export async function makeThumbnail(bytes: Uint8Array): Promise<Thumbnail> {
  const frame = await firstFrame(bytes);
  const sized = frame.width > THUMB_WIDTH ? frame.resize(THUMB_WIDTH, Image.RESIZE_AUTO) : frame;
  const webp = await sized.encodeWebP(WEBP);
  return { webp, width: sized.width, height: sized.height, rgba: new Uint8Array(sized.bitmap) };
}
