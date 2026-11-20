/** Colour maths for room colours (#85): #rrggbb ⇄ HSL, mixing. Hue in degrees, saturation and lightness 0–1. */

export interface Hsl {
  readonly h: number;
  readonly s: number;
  readonly l: number;
}

type Rgb = readonly [number, number, number];

const DEGREES = 360;
const SECTOR = 60;

const toRgb = (hex: string): Rgb => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255) as unknown as Rgb;
const toHex = (rgb: Rgb): string => '#' + rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255).toString(16).padStart(2, '0')).join('');

function hueOf([r, g, b]: Rgb, max: number, delta: number): number {
  if (delta === 0) return 0;
  const sector = max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return sector * SECTOR;
}

export function hexToHsl(hex: string): Hsl {
  const rgb = toRgb(hex);
  const [max, min] = [Math.max(...rgb), Math.min(...rgb)];
  const delta = max - min;
  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));
  return { h: hueOf(rgb, max, delta), s, l };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const sector = (((h % DEGREES) + DEGREES) % DEGREES) / SECTOR;
  const x = chroma * (1 - Math.abs((sector % 2) - 1));
  const sectors: readonly Rgb[] = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]];
  const [r, g, b] = sectors[Math.floor(sector) % 6] ?? [0, 0, 0];
  const m = l - chroma / 2;
  return toHex([r + m, g + m, b + m]);
}

/** `amount` of `a` and the rest of `b`, channel by channel. */
export function mix(a: string, b: string, amount: number): string {
  const [from, to] = [toRgb(a), toRgb(b)];
  return toHex(from.map((c, at) => c * amount + (to[at] ?? 0) * (1 - amount)) as unknown as Rgb);
}

/** Weighted average of colours in RGB, as #rrggbb. */
export function averageColour(colours: readonly { readonly colour: string; readonly weight: number }[]): string {
  const total = colours.reduce((sum, { weight }) => sum + weight, 0);
  const sum = colours.reduce<Rgb>((acc, { colour, weight }) => {
    const rgb = toRgb(colour);
    return [acc[0] + rgb[0] * weight, acc[1] + rgb[1] * weight, acc[2] + rgb[2] * weight];
  }, [0, 0, 0]);
  return toHex(sum.map((c) => c / total) as unknown as Rgb);
}
