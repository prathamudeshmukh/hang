import type { ItemKind } from '../db/schema.ts';
import type { CardModel } from './cardModel.ts';
import { thingsCount } from './catalogueNote.ts';

export type KindFilter = ItemKind | 'all';

/** Chip order (#42). */
const KIND_ORDER: readonly ItemKind[] = ['article', 'video', 'post', 'image', 'link'];
/** Below this many kinds, All and the only chip would show the same wall, so the row is hidden. */
export const MIN_KINDS_FOR_CHIPS = 2;

const NOUNS: Record<ItemKind, readonly [singular: string, plural: string]> = {
  article: ['article', 'articles'],
  video: ['video', 'videos'],
  post: ['post', 'posts'],
  image: ['image', 'images'],
  link: ['link', 'links'],
};

/** Pending cards have no kind yet; a failed card is drawn, and filed, as a link (#42). */
function kindOf(card: CardModel): ItemKind | null {
  if (card.variant === 'pending') return null;
  return card.variant === 'failed' ? 'link' : card.variant;
}

export function kindsIn(cards: readonly CardModel[]): readonly ItemKind[] {
  const present = new Set(cards.map(kindOf));
  return KIND_ORDER.filter((kind) => present.has(kind));
}

export function filterCards(cards: readonly CardModel[], filter: KindFilter): readonly CardModel[] {
  return filter === 'all' ? cards : cards.filter((card) => kindOf(card) === filter);
}

/** A kind that emptied, or a row that's hidden, quietly goes back to All. */
export function selectedOrAll(filter: KindFilter, kinds: readonly ItemKind[]): KindFilter {
  const showsChips = kinds.length >= MIN_KINDS_FOR_CHIPS;
  return filter !== 'all' && showsChips && kinds.includes(filter) ? filter : 'all';
}

export function kindCount(filter: KindFilter, count: number): string {
  if (filter === 'all') return thingsCount(count);
  const [singular, plural] = NOUNS[filter];
  return `${count} ${count === 1 ? singular : plural}`;
}

export function chipLabel(filter: KindFilter): string {
  const word = filter === 'all' ? 'all' : NOUNS[filter][1];
  return word.charAt(0).toUpperCase() + word.slice(1);
}
