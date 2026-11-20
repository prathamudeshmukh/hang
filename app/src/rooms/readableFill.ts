import { contrastRatio } from '../theme/contrast.ts';
import { PALETTES, SCREENING_ROOM } from '../theme/tokens.ts';
import { mix } from './colour.ts';

/** A room colour as a print's gradient (top-left to bottom-right) and the ink written on it (#85). */
export interface Fill {
  readonly top: string;
  readonly end: string;
  readonly ink: string;
}

/** The two inks a fill can take, the same in light and dark: they're chosen against the fill, not the wall. */
export const DARK_INK = PALETTES.light.ink;
export const LIGHT_INK = SCREENING_ROOM.ink;

const AA = 4.5;
const WHITE = '#ffffff';
const TOP_COLOUR = 0.9;
const END_COLOUR = 0.86;
const PUSH = 0.9;
const MAX_PUSHES = 24;

const inkOn = (background: string) => (contrastRatio(DARK_INK, background) >= contrastRatio(LIGHT_INK, background) ? DARK_INK : LIGHT_INK);

function gradientOf(colour: string): Fill {
  const top = mix(colour, WHITE, TOP_COLOUR);
  const end = mix(colour, DARK_INK, END_COLOUR);
  return { top, end, ink: inkOn(end) };
}

const readable = ({ top, end, ink }: Fill) => Math.min(contrastRatio(ink, top), contrastRatio(ink, end)) >= AA;

/** A step away from the ink: darker under light ink, lighter under dark ink. */
const pushed = (colour: string, ink: string) => (ink === LIGHT_INK ? mix(colour, DARK_INK, PUSH) : mix(colour, WHITE, PUSH));

function pushUntilReadable(colour: string, pushes: number): Fill {
  const fill = gradientOf(colour);
  if (readable(fill) || pushes >= MAX_PUSHES) return fill;
  return pushUntilReadable(pushed(colour, fill.ink), pushes + 1);
}

/** Pure: the colour's gradient, pushed away from its ink until both ends clear 4.5:1. */
export const readableFill = (colour: string): Fill => pushUntilReadable(colour, 0);
