import { useMemo, useState } from 'react';
import type { CardModel } from './cardModel.ts';
import type { KindFilter } from './kindFilter.ts';
import { settledChoice, toggledShuffle, viewOf, type PlaceChoice, type PlaceView } from './placeView.ts';
import { newSeed } from './shuffleOrder.ts';

const NEWEST_FIRST: PlaceChoice = { filter: 'all', seed: null };

export interface PlaceViewControls {
  readonly view: PlaceView;
  readonly shuffled: boolean;
  readonly choose: (filter: KindFilter) => void;
  /** On deals a fresh order; off goes back to newest first. */
  readonly toggleShuffle: () => void;
}

/** Filter and Shuffle live in screen state, so they reset when the screen is left (#42). */
export function usePlaceView(cards: readonly CardModel[]): PlaceViewControls {
  const [choice, setChoice] = useState(NEWEST_FIRST);
  const view = useMemo(() => viewOf(cards, choice), [cards, choice]);
  const settled = settledChoice(choice, view);
  // Adjusting state while rendering (React's pattern for derived state) makes a fallback to All stick.
  if (settled !== choice) setChoice(settled);
  return {
    view,
    shuffled: choice.seed !== null,
    choose: (filter) => setChoice((current) => ({ ...current, filter })),
    toggleShuffle: () => setChoice((current) => toggledShuffle(current, newSeed)),
  };
}
