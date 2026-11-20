import type { ItemKind } from '../db/schema.ts';
import { averageColour, hexToHsl, type Hsl } from './colour.ts';

/** One item's say in its room's colour (#85): its picture's colour and kind, newest first. */
export interface ColourVote {
  readonly colour: string;
  readonly kind: ItemKind;
}

/** The room's hue: a family (0–11, 30° each) with its average colour and up to two runners-up; or grey; or no pictures. */
export type RoomHue =
  | { readonly kind: 'family'; readonly family: number; readonly base: Hsl; readonly others: readonly Hsl[] }
  | { readonly kind: 'grey' }
  | { readonly kind: 'none' };

export const VOTE_LIMIT = 12;
const FAMILY_DEGREES = 30;
const FAMILIES = 12;
const RECENCY_STEP = 0.05;
/** Link previews are often logos or brand cards. */
const KIND_WEIGHT: Partial<Record<ItemKind, number>> = { link: 0.5 };
const GREYISH = { maxSaturation: 0.15, minLightness: 0.08, maxLightness: 0.92 } as const;
/** Another family has to outweigh the current one by this much to take over the room. */
const HYSTERESIS = 1.25;
const RUNNERS_UP = 2;

interface Family {
  readonly family: number;
  readonly weight: number;
  readonly colours: readonly { readonly colour: string; readonly weight: number }[];
}

const isGreyish = ({ s, l }: Hsl) => s < GREYISH.maxSaturation || l < GREYISH.minLightness || l > GREYISH.maxLightness;
const familyOf = ({ h }: Hsl) => Math.floor(h / FAMILY_DEGREES) % FAMILIES;
const weightOf = ({ kind }: ColourVote, index: number) => Math.max(0, 1 - index * RECENCY_STEP) * (KIND_WEIGHT[kind] ?? 1);

function familiesOf(votes: readonly ColourVote[]): readonly Family[] {
  const coloured = votes
    .slice(0, VOTE_LIMIT)
    .map((vote, index) => ({ colour: vote.colour, hsl: hexToHsl(vote.colour), weight: weightOf(vote, index) }))
    .filter(({ hsl }) => !isGreyish(hsl));
  const ids = [...new Set(coloured.map(({ hsl }) => familyOf(hsl)))];
  const families = ids.map((family) => {
    const colours = coloured.filter(({ hsl }) => familyOf(hsl) === family);
    return { family, weight: colours.reduce((sum, { weight }) => sum + weight, 0), colours };
  });
  // Sorts the fresh array `map` made; Hermes has no `toSorted`.
  return families.sort((a, b) => b.weight - a.weight);
}

function withHysteresis(families: readonly Family[], previous: number | null): readonly Family[] {
  const [leader] = families;
  const held = families.find(({ family }) => family === previous);
  if (!leader || !held || leader.weight >= held.weight * HYSTERESIS) return families;
  return [held, ...families.filter((family) => family !== held)];
}

const colourOf = ({ colours }: Family): Hsl => hexToHsl(averageColour(colours));

/** Pure: the hue a room's newest pictures agree on (#85 rules 1–4 and hysteresis). `votes` are newest first. */
export function roomHue(votes: readonly ColourVote[], previousFamily: number | null): RoomHue {
  if (votes.length === 0) return { kind: 'none' };
  const [winner, ...rest] = withHysteresis(familiesOf(votes), previousFamily);
  if (!winner) return { kind: 'grey' };
  return { kind: 'family', family: winner.family, base: colourOf(winner), others: rest.slice(0, RUNNERS_UP).map(colourOf) };
}
