import { sameCard, type CardMedia, type CardModel } from '../grid/cardModel.ts';
import { actionFor, movedNote, type FeedAction } from './feedCopy.ts';

export type FeedMedia =
  /** Images fit whole; everything else crops to fill (#31). */
  | { readonly kind: 'picture'; readonly media: CardMedia; readonly fit: 'contain' | 'cover'; readonly playable: boolean }
  /** No thumbnail: the title set large. */
  | { readonly kind: 'title' }
  | { readonly kind: 'post' }
  | { readonly kind: 'pending' };

/** One screen of the swipe feed (DESIGN.md §8): media on top, then note, title, summary and pills. */
export interface FeedPage {
  readonly card: CardModel;
  readonly media: FeedMedia;
  /** The catalogue note, or where the item was moved during this feed. */
  readonly note: string;
  /** False when the media area already shows it. */
  readonly showTitle: boolean;
  readonly summary: string | null;
  readonly action: FeedAction;
  /** Where it hangs now; null is the Inbox. */
  readonly placeId: string | null;
  readonly accessibilityLabel: string;
}

/** Pages are rebuilt on every live-query refresh; this keeps unchanged ones from redrawing. */
export function samePage(a: FeedPage, b: FeedPage): boolean {
  return sameCard(a.card, b.card) && a.note === b.note && a.summary === b.summary && a.placeId === b.placeId;
}

export interface FeedPageExtras {
  readonly summary: string | null;
  /** Set when the item was moved since the feed opened: the place's name, or null if it isn't on the device. */
  readonly movedTo?: string | null;
  readonly placeId: string | null;
}

export function feedMediaOf(card: CardModel): FeedMedia {
  if (card.variant === 'pending') return { kind: 'pending' };
  if (card.variant === 'post') return { kind: 'post' };
  if (!card.media) return { kind: 'title' };
  return { kind: 'picture', media: card.media, fit: card.variant === 'image' ? 'contain' : 'cover', playable: card.variant === 'video' };
}

function titleShownBelow(media: FeedMedia, card: CardModel): boolean {
  return card.title !== null && (media.kind === 'picture' || media.kind === 'pending');
}

export function toFeedPage(card: CardModel, { summary, movedTo, placeId }: FeedPageExtras): FeedPage {
  const media = feedMediaOf(card);
  return {
    card,
    media,
    note: movedTo === undefined ? card.note : movedNote(movedTo),
    showTitle: titleShownBelow(media, card),
    summary,
    action: actionFor(card.variant),
    placeId,
    accessibilityLabel: card.accessibilityLabel,
  };
}
