import { joinNote } from '../grid/catalogueNote.ts';
import { postWords, sameCard, type CardMedia, type CardModel } from '../grid/cardModel.ts';
import { actionFor, movedNote, type FeedAction } from './feedCopy.ts';

export type FeedMedia =
  /** Thumbnails crop to fill the top of the page (#31). */
  | { readonly kind: 'picture'; readonly media: CardMedia; readonly playable: boolean }
  /** An image fills the page, whole, and zooms into its original (#60). */
  | ImageMedia
  /** No thumbnail: the title set large. */
  | { readonly kind: 'title' }
  | PostMedia
  | { readonly kind: 'pending' }
  /** An imageless article with reader text: no media box, the page is its words (#61). */
  | { readonly kind: 'none' };

export interface ImageMedia {
  readonly kind: 'image';
  readonly media: CardMedia;
  readonly original: string | null;
}

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

/** `item_content.text` separates paragraphs with a blank line (#61). */
const PARAGRAPH_BREAK = '\n\n';

/** An article's first lines, which take the summary's place so reading starts on the feed (#61). */
export interface Opening {
  readonly text: string;
  /** What TalkBack reads: the first paragraph, not a screenful. */
  readonly spoken: string;
}

/** A link has nothing behind it but the page, so its description gets room; elsewhere it's a teaser (#54). */
const SUMMARY_LINES = { link: 5, other: 2 } as const;
export type SummaryLines = (typeof SUMMARY_LINES)[keyof typeof SUMMARY_LINES];

/** One screen of the swipe feed (DESIGN.md §8): media on top, then note, title, summary (or opening) and pills. */
export interface FeedPage {
  readonly card: CardModel;
  readonly media: FeedMedia;
  /** The catalogue note, or where the item was moved during this feed. */
  readonly note: string;
  /** False when the media area already shows it. */
  readonly showTitle: boolean;
  /** Null while the opening stands in for it. */
  readonly summary: string | null;
  readonly summaryLines: SummaryLines;
  readonly opening: Opening | null;
  readonly action: FeedAction;
  /** Where it hangs now; null is the Inbox. */
  readonly placeId: string | null;
  readonly accessibilityLabel: string;
}

/** Pages are rebuilt on every live-query refresh; this keeps unchanged ones from redrawing. */
export function samePage(a: FeedPage, b: FeedPage): boolean {
  return sameCard(a.card, b.card) && a.note === b.note && a.summary === b.summary && a.opening?.text === b.opening?.text && a.placeId === b.placeId;
}

export interface FeedPageExtras {
  readonly summary: string | null;
  /** The start of the item's reader text, when it has any (#61). */
  readonly opening?: string | null;
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
  if (card.variant === 'image') return { kind: 'image', media: card.media, original: card.original };
  return { kind: 'picture', media: card.media, playable: card.variant === 'video' };
}

/** Only an article opens on its first lines; other kinds keep their summary (DESIGN.md §8). */
function openingOf(card: CardModel, text: string | null | undefined): Opening | null {
  const trimmed = text?.trim();
  if (card.variant !== 'article' || !trimmed) return null;
  return { text: trimmed, spoken: trimmed.split(PARAGRAPH_BREAK)[0] ?? trimmed };
}

/** The media the page draws: the card's own, except an imageless article that opens on its text has none. */
export function pageMediaOf(card: CardModel, hasOpening: boolean): FeedMedia {
  const media = feedMediaOf(card);
  return hasOpening && card.variant === 'article' && media.kind === 'title' ? { kind: 'none' } : media;
}

/** Kinds whose media isn't already the title (the large title, a post's words). */
const SHOWS_TITLE_BELOW: ReadonlySet<FeedMedia['kind']> = new Set(['picture', 'image', 'pending', 'none']);

function titleShownBelow(media: FeedMedia, card: CardModel): boolean {
  return card.title !== null && SHOWS_TITLE_BELOW.has(media.kind);
}

function noteOf(card: CardModel, { movedTo, saved }: FeedPageExtras): string {
  if (movedTo !== undefined) return movedNote(movedTo);
  return card.variant === 'link' ? joinNote([card.note, saved ?? null]) : card.note;
}

export function toFeedPage(card: CardModel, extras: FeedPageExtras): FeedPage {
  const opening = openingOf(card, extras.opening);
  const media = pageMediaOf(card, opening !== null);
  return {
    card,
    media,
    note: noteOf(card, extras),
    showTitle: titleShownBelow(media, card),
    summary: opening ? null : extras.summary,
    summaryLines: card.variant === 'link' ? SUMMARY_LINES.link : SUMMARY_LINES.other,
    opening,
    action: actionFor(card.variant),
    placeId: extras.placeId,
    accessibilityLabel: card.accessibilityLabel,
  };
}
