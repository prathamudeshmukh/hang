import { MARK_COLOURS } from '../theme/hangMark.ts';
import type { Scheme } from '../theme/tokens.ts';
import { hexToHsl, hslToHex, type Hsl } from './colour.ts';
import { readableFill, type Fill } from './readableFill.ts';
import type { RoomHue } from './roomHue.ts';
import { stableIndex } from './stableIndex.ts';

/** A colour as drawn: the flat colour (frames, the hero's start) and its readable gradient. */
export interface Swatch extends Fill {
  readonly colour: string;
}

/** One scheme's room colours: the room's own, and three for its prints without a picture. */
export interface SchemeColours {
  readonly colour: string;
  readonly fill: Fill;
  readonly prints: readonly [Swatch, Swatch, Swatch];
}

/** What the sync step stores per collection (#85): the family for hysteresis (null for grey or no pictures), both schemes. */
export interface RoomColours {
  readonly family: number | null;
  readonly light: SchemeColours;
  readonly dark: SchemeColours;
}

/** What `room_colours.colours` holds: both schemes (the family has its own column). */
export type StoredRoomColours = Pick<RoomColours, 'light' | 'dark'>;

interface Range {
  readonly min: number;
  readonly max: number;
  /** Multiplies the colour's saturation. */
  readonly saturation: number;
  /** Saturation is never above this. */
  readonly maxSaturation: number;
}

/** Rich, like a print: never neon or muddy. Dark mode is deeper and a little calmer so it doesn't glow on the dark wall. */
const RICH: Readonly<Record<Scheme, Range>> = {
  light: { min: 0.3, max: 0.5, saturation: 1, maxSaturation: 1 },
  dark: { min: 0.22, max: 0.38, saturation: 0.85, maxSaturation: 1 },
};
/** Reds go deep to oxblood, so a red room never passes for vermilion (#85). */
const OXBLOOD: Readonly<Record<Scheme, Range>> = {
  light: { min: 0.22, max: 0.32, saturation: 1, maxSaturation: 0.5 },
  dark: { min: 0.18, max: 0.28, saturation: 0.85, maxSaturation: 0.45 },
};
const REDS = { from: 345, to: 25 } as const;
const SHADE_STEP = 0.08;
/** A grey room: the Sage wall's own grey-green, honest about a room of concrete. */
const GREY: Hsl = { h: 130, s: 0.06, l: 0.42 };
/** Sage is left out: it's the wall's own colour and passes for a grey room. */
const { ochre, teal, rose, blue } = MARK_COLOURS;
const ICON_COLOURS = [ochre, teal, rose, blue] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const isRed = ({ h }: Hsl) => h >= REDS.from || h <= REDS.to;
const rangeFor = (hsl: Hsl, scheme: Scheme) => (isRed(hsl) ? OXBLOOD : RICH)[scheme];

function enrich(hsl: Hsl, range: Range): Hsl {
  return { h: hsl.h, s: Math.min(range.maxSaturation, hsl.s * range.saturation), l: clamp(hsl.l, range.min, range.max) };
}

/** A lighter or darker shade inside the range: the other way at its edge, closer together when the range is narrow. */
function shade(room: Hsl, range: Range, direction: 1 | -1): Hsl {
  const step = Math.min(SHADE_STEP, (range.max - range.min) / 2);
  const l = room.l + direction * step;
  const inRange = l >= range.min && l <= range.max;
  return { ...room, l: clamp(inRange ? l : room.l - 2 * direction * step, range.min, range.max) };
}

const swatchOf = (hsl: Hsl): Swatch => {
  const colour = hslToHex(hsl);
  return { colour, ...readableFill(colour) };
};

/** The room's colour, and its prints in three shades of it: neighbours differ, the hue still says which room. */
function schemeColours(base: Hsl, scheme: Scheme): SchemeColours {
  const range = rangeFor(base, scheme);
  const room = enrich(base, range);
  const colour = hslToHex(room);
  return { colour, fill: readableFill(colour), prints: [swatchOf(room), swatchOf(shade(room, range, 1)), swatchOf(shade(room, range, -1))] };
}

function baseOf(hue: RoomHue, collectionId: string): Hsl {
  if (hue.kind === 'family') return hue.base;
  if (hue.kind === 'grey') return GREY;
  return hexToHsl(ICON_COLOURS[stableIndex(collectionId, ICON_COLOURS.length)] ?? ochre);
}

/** Pure: a room's hue made rich and readable for both walls (#85 rules 5–6). */
export function roomColours(hue: RoomHue, collectionId: string): RoomColours {
  const base = baseOf(hue, collectionId);
  return { family: hue.kind === 'family' ? hue.family : null, light: schemeColours(base, 'light'), dark: schemeColours(base, 'dark') };
}
