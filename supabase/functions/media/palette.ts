/** SPEC §5 `palette`: { dominant, muted, onDominant } as #rrggbb. Colours are DESIGN.md §3 tokens. */
export interface Palette {
  readonly dominant: string;
  readonly muted: string;
  readonly onDominant: string;
}

export const INK = '#1B1A17';
export const WALL = '#F7F5F0';

const CHANNELS = 4;
const VISIBLE_ALPHA = 128;
const BUCKET_SHIFT = 4;
const MAX_SAMPLES = 50_000;
const MUTED = { maxSaturation: 0.4, minLightness: 0.25, maxLightness: 0.75 } as const;
const SOFTEN_TOWARD_GREY = 0.5;
const MID_GREY = 128;

type Rgb = readonly [number, number, number];

interface Bucket {
  readonly sum: Rgb;
  readonly count: number;
}

const hex = ([r, g, b]: Rgb) => '#' + [r, g, b].map((c) => Math.round(c).toString(16).padStart(2, '0')).join('');
const parseHex = (value: string): Rgb => [1, 3, 5].map((at) => parseInt(value.slice(at, at + 2), 16)) as unknown as Rgb;
const average = ({ sum, count }: Bucket): Rgb => [sum[0] / count, sum[1] / count, sum[2] / count];

function isMuted([r, g, b]: Rgb): boolean {
  const [max, min] = [Math.max(r, g, b) / 255, Math.min(r, g, b) / 255];
  const lightness = (max + min) / 2;
  const saturation = max === min ? 0 : (max - min) / (1 - Math.abs(2 * lightness - 1));
  return saturation <= MUTED.maxSaturation && lightness >= MUTED.minLightness && lightness <= MUTED.maxLightness;
}

function relativeLuminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as unknown as Rgb;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/** Quantises visible pixels into 4-bit-per-channel buckets; samples evenly on large bitmaps. */
function bucketsOf(rgba: Uint8Array): Bucket[] {
  const pixels = Math.floor(rgba.length / CHANNELS);
  const step = Math.max(1, Math.floor(pixels / MAX_SAMPLES));
  const buckets = new Map<number, Bucket>();
  for (let pixel = 0; pixel < pixels; pixel += step) {
    const at = pixel * CHANNELS;
    if ((rgba[at + 3] ?? 0) < VISIBLE_ALPHA) continue;
    const rgb: Rgb = [rgba[at] ?? 0, rgba[at + 1] ?? 0, rgba[at + 2] ?? 0];
    const key = (rgb[0] >> BUCKET_SHIFT) << 8 | (rgb[1] >> BUCKET_SHIFT) << 4 | (rgb[2] >> BUCKET_SHIFT);
    const { sum, count } = buckets.get(key) ?? { sum: [0, 0, 0], count: 0 };
    buckets.set(key, { sum: [sum[0] + rgb[0], sum[1] + rgb[1], sum[2] + rgb[2]], count: count + 1 });
  }
  return [...buckets.values()].sort((a, b) => b.count - a.count);
}

const soften = (rgb: Rgb): Rgb => rgb.map((c) => c + (MID_GREY - c) * SOFTEN_TOWARD_GREY) as unknown as Rgb;

/** Palette of an RGBA bitmap, or null when it has no visible pixels. */
export function paletteOf(rgba: Uint8Array): Palette | null {
  const buckets = bucketsOf(rgba);
  const top = buckets[0];
  if (!top) return null;
  const dominant = average(top);
  const mutedBucket = buckets.find((bucket) => isMuted(average(bucket)));
  const muted = mutedBucket ? average(mutedBucket) : soften(dominant);
  const onDominant = contrast(dominant, parseHex(INK)) >= contrast(dominant, parseHex(WALL)) ? INK : WALL;
  return { dominant: hex(dominant), muted: hex(muted), onDominant };
}
