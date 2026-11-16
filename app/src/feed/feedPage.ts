import { joinNote } from '../grid/catalogueNote.ts';
import { postWords, sameCard, type CardMedia, type CardModel } from '../grid/cardModel.ts';
import { actionFor, movedNote, type FeedAction } from './feedCopy.ts';

export type FeedMedia =
  /** Images fit whole; everything else crops to fill (#31). */
  | { readonly kind: 'picture'; readonly media: CardMedia; readonly fit: 'contain' | 'cover'; readonly playable: boolean }
  /** No thumbnail: the title set large. */
  | { readonly kind: 'title' }
  | PostMedia
  | { readonly kind: 'pending' };

/** Who signs a post page's words (#59): the author's name and `@handle`, either of which may be missing. */
export interface Imprint {
  readonly author: string | null;
  readonly handle: string | null;
}

/** A post page set as a broadside (DESIGN.md §8): the words, who signs them, the picture that answers them. */
export interface PostMedia {
  readonly kind: 'post';
  /** Null for a picture-only post: the picture takes the words' place. */
  readonly words: string | null;
  readonly imprint: Imprint | null;
  readonly picture: CardMedia | null;
}

/** A link has nothing behind it but the page, so its description gets room; elsewhere it's a teaser (#54). */
const SUMMARY_LINES = { link: 5, other: 2 } as const;
export type SummaryLines = (typeof SUMMARY_LINES)[keyof typeof SUMMARY_LINES];

/** One screen of the swipe feed (DESIGN.md §8): media on top, then note, title, summary and pills. */
export interface FeedPage {
  readonly card: CardModel;
  readonly media: FeedMedia;
  /** The catalogue note, or where the item was moved during this feed. */
  readonly note: string;
  /** False when the media area already shows it. */
  readonly showTitle: boolean;
  readonly summary: string | null;
  readonly summaryLines: SummaryLines;
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
  /** *saved 3 days ago*; only a link's note carries it (#54). */
  readonly saved?: string | null;
}

/** The same words the post's print sets (#58), so a flight never lands words on a page without them. */
function postMediaOf(card: CardModel): PostMedia {
  const { author, handle } = card;
  return { kind: 'post', words: postWords(card), imprint: author || handle ? { author, handle } : null, picture: card.media };
}

export function feedMediaOf(card: CardModel): FeedMedia {
  if (card.variant === 'pending') return { kind: 'pending' };
  if (card.variant === 'post') return postMediaOf(card);
  if (!card.media) return { kind: 'title' };
  return { kind: 'picture', media: card.media, fit: card.variant === 'image' ? 'contain' : 'cover', playable: card.variant === 'video' };
}

function titleShownBelow(media: FeedMedia, card: CardModel): boolean {
  return card.title !== null && (media.kind === 'picture' || media.kind === 'pending');
}

function noteOf(card: CardModel, { movedTo, saved }: FeedPageExtras): string {
  if (movedTo !== undefined) return movedNote(movedTo);
  return card.variant === 'link' ? joinNote([card.note, saved ?? null]) : card.note;
}

export function toFeedPage(card: CardModel, extras: FeedPageExtras): FeedPage {
  const media = feedMediaOf(card);
  return {
    card,
    media,
    note: noteOf(card, extras),
    showTitle: titleShownBelow(media, card),
    summary: extras.summary,
    summaryLines: card.variant === 'link' ? SUMMARY_LINES.link : SUMMARY_LINES.other,
    action: actionFor(card.variant),
    placeId: extras.placeId,
    accessibilityLabel: card.accessibilityLabel,
  };
}
