import type { ItemKind } from '../db/schema.ts';
import type { CardModel } from './cardModel.ts';
import { filterCards, kindCount, kindsIn, selectedOrAll, type KindFilter } from './kindFilter.ts';
import { shuffleOrder } from './shuffleOrder.ts';

const MIN_CARDS_TO_SHUFFLE = 2;

/** What the viewer picked; lives only while the screen is open (#42). */
export interface PlaceChoice {
  readonly filter: KindFilter;
  /** Null is newest first. */
  readonly seed: number | null;
}

export interface PlaceView {
  readonly cards: readonly CardModel[];
  /** The filter actually applied, after falling back to All. */
  readonly filter: KindFilter;
  /** The chips to show; fewer than two hides the row. */
  readonly kinds: readonly ItemKind[];
  /** "4 videos"; null on an empty wall. */
  readonly count: string | null;
  readonly canShuffle: boolean;
}

export function viewOf(cards: readonly CardModel[], choice: PlaceChoice): PlaceView {
  const kinds = kindsIn(cards);
  const filter = selectedOrAll(choice.filter, kinds);
  const filtered = filterCards(cards, filter);
  return {
    cards: choice.seed === null ? filtered : shuffleOrder(filtered, choice.seed),
    filter,
    kinds,
    count: filtered.length > 0 ? kindCount(filter, filtered.length) : null,
    canShuffle: filtered.length >= MIN_CARDS_TO_SHUFFLE,
  };
}

/** A kind that emptied stays on All, so it doesn't come back by itself when a card of that kind syncs in. */
export function settledChoice(choice: PlaceChoice, view: PlaceView): PlaceChoice {
  return view.filter === choice.filter ? choice : { ...choice, filter: view.filter };
}

/** On deals a fresh order; off goes back to newest first. */
export function toggledShuffle(choice: PlaceChoice, dealSeed: () => number): PlaceChoice {
  return { ...choice, seed: choice.seed === null ? dealSeed() : null };
}
