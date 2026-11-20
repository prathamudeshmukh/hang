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

/** Rich, like a print: never neon or muddy. Dark mode is deeper and a little calmer so it doesn't glow on the dark wall. */
/** What `room_colours.colours` holds: both schemes (the family has its own column). */
export type StoredRoomColours = Pick<RoomColours, 'light' | 'dark'>;

const RICH: Readonly<Record<Scheme, { readonly min: number; readonly max: number; readonly saturation: number }>> = {
  light: { min: 0.3, max: 0.5, saturation: 1 },
  dark: { min: 0.22, max: 0.38, saturation: 0.85 },
};
const SHADE_STEP = 0.08;
/** A grey room: the Sage wall's own grey-green, honest about a room of concrete. */
const GREY: Hsl = { h: 130, s: 0.06, l: 0.42 };
const { ochre, teal, rose, blue, sage } = MARK_COLOURS;
const ICON_COLOURS = [ochre, teal, rose, blue, sage] as const;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function enrich({ h, s, l }: Hsl, scheme: Scheme): Hsl {
  const { min, max, saturation } = RICH[scheme];
  return { h, s: s * saturation, l: clamp(l, min, max) };
}

/** A lighter (or darker) shade that stays in the scheme's range, going the other way at its edge. */
function shade(base: Hsl, scheme: Scheme, step: number): Hsl {
  const { min, max } = RICH[scheme];
  const l = base.l + step;
  return { ...base, l: l >= min && l <= max ? l : base.l - 2 * step };
}

const swatchOf = (hsl: Hsl): Swatch => {
  const colour = hslToHex(hsl);
  return { colour, ...readableFill(colour) };
};

function schemeColours(base: Hsl, others: readonly Hsl[], scheme: Scheme): SchemeColours {
  const room = enrich(base, scheme);
  const [second, third] = [
    others[0] ? enrich(others[0], scheme) : shade(room, scheme, SHADE_STEP),
    others[1] ? enrich(others[1], scheme) : shade(room, scheme, -SHADE_STEP),
  ];
  const colour = hslToHex(room);
  return { colour, fill: readableFill(colour), prints: [swatchOf(room), swatchOf(second), swatchOf(third)] };
}

function baseOf(hue: RoomHue, collectionId: string): { readonly base: Hsl; readonly others: readonly Hsl[] } {
  if (hue.kind === 'family') return { base: hue.base, others: hue.others };
  if (hue.kind === 'grey') return { base: GREY, others: [] };
  return { base: hexToHsl(ICON_COLOURS[stableIndex(collectionId, ICON_COLOURS.length)]), others: [] };
}

/** Pure: a room's hue made rich and readable for both walls (#85 rules 5–6). */
export function roomColours(hue: RoomHue, collectionId: string): RoomColours {
  const { base, others } = baseOf(hue, collectionId);
  return {
    family: hue.kind === 'family' ? hue.family : null,
    light: schemeColours(base, others, 'light'),
    dark: schemeColours(base, others, 'dark'),
  };
}
