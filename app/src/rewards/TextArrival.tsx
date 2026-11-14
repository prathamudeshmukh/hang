import type { ReactNode } from 'react';
import { useReducedMotion } from 'react-native-reanimated';
import { textJustArrived, type ShownText } from '@/grid/arrival';
import type { CardModel } from '@/grid/cardModel';
import { useArrival, type ArrivalRule } from '@/grid/useArrival';
import { MOTION } from '@/theme/tokens';
import { Fade } from './Fade';

/** Where a fetching card's faded caption sat (DESIGN.md §8 pending). */
const FETCHING_OPACITY = 0.5;
const TEXT_RULE: ArrivalRule<ShownText> = {
  justArrived: textJustArrived,
  same: (a, b) => a.id === b.id && a.variant === b.variant,
};

/**
 * First beat of "fetching fills in" (DESIGN.md §7, #34): a card whose text lands while it's on screen comes in
 * from the fetching card's faded ink. Wrap something that persists across the card's redraws.
 */
export function TextArrival({ card, children }: { readonly card: CardModel; readonly children: ReactNode }) {
  const reduceMotion = useReducedMotion();
  const arrived = useArrival({ id: card.id, variant: card.variant }, TEXT_RULE);
  if (!arrived || reduceMotion) return children;
  return <Fade key={card.id} from={FETCHING_OPACITY} to={1} durationMs={MOTION.baseMs}>{children}</Fade>;
}
