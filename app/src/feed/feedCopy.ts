import type { CardVariant } from '../grid/cardModel.ts';

/** The main pill's word (DESIGN.md §8): only articles are read and only videos watched. */
export type FeedAction = 'Read' | 'Watch' | 'Open';

const SINGLE = 1;

export function actionFor(variant: CardVariant): FeedAction {
  if (variant === 'article') return 'Read';
  if (variant === 'video') return 'Watch';
  return 'Open';
}

/** *4 of 12*; one item has nothing to count. */
export function counterText(index: number, total: number): string | null {
  return index < 0 || total <= SINGLE ? null : `${index + 1} of ${total}`;
}

/** Null: moved somewhere no longer on the device. */
export function movedNote(placeName: string | null): string {
  return placeName === null ? 'moved' : `moved to ${placeName}`;
}
