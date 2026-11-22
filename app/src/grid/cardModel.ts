import type { Item, ItemKind } from '../db/schema.ts';
import type { PrintSwatch } from '../rooms/roomOf.ts';
import { hostOf } from './host.ts';
import { dayWords } from '../copy/dayWords.ts';
import { durationNote, joinNote, minutesNote } from './catalogueNote.ts';

/** Height over width. Taller is cropped from the top, wider from both sides (#29). */
export const MIN_RATIO = 0.5;
export const MAX_RATIO = 1.6;

export const FETCHING = 'fetching…';
const COULD_NOT_READ = 'couldn’t read this';
const FALLBACK_KIND: ItemKind = 'link';
/** The dashed box's shape while the size of the image isn't known (DESIGN.md §8 pending). */
const WAITING_RATIO = 5 / 4;
/** After this long without the server finishing the image, it's probably not coming: draw a text card. */
const IMAGE_WAIT_MS = 2 * 60 * 1000;

export type CardVariant = ItemKind | 'pending' | 'failed';

export interface CardMedia {
  /** Height over width of the box, clamped to MIN_RATIO..MAX_RATIO. */
  readonly ratio: number;
  /** The thumbnail's own height over width, for drawing it whole (the feed's image fit, #32). */
  readonly naturalRatio: number;
  /** The downloaded thumbnail; null while the box waits for it. */
  readonly uri: string | null;
}

/** One masonry card, ready to draw (DESIGN.md §8). */
export interface CardModel {
  readonly id: string;
  readonly url: string;
  readonly variant: CardVariant;
  readonly title: string | null;
  /** The site name as the server gave it, else the host. */
  readonly site: string;
  readonly note: string;
  /** Null makes a text card. */
  readonly media: CardMedia | null;
  /** The image the server found, at its source: an image page loads it when zoomed past the thumbnail (#60). */
  readonly original: string | null;
  readonly postText: string | null;
  /** Who wrote a post (#58): the author's name, else `@handle`. Null on every other kind. */
  readonly byline: string | null;
  /** A post's author's name and `@handle`, apart, for the feed page's imprint (#59). Null on every other kind. */
  readonly author: string | null;
  readonly handle: string | null;
  /** Who made a video (#108): the channel oEmbed named. Null on every other kind. */
  readonly channel: string | null;
  /** The page's own description; only an imageless link's wall label draws it (#58). */
  readonly description: string | null;
  readonly accessibilityLabel: string;
  /** Its room's colour, for when it has no picture (#85); null for an unsorted item. Set by the lists, not here. */
  readonly swatch: PrintSwatch | null;
}

export function clampRatio({ width, height }: { readonly width: number | null; readonly height: number | null }): number | null {
  if (!width || !height || width <= 0 || height <= 0) return null;
  return Math.min(MAX_RATIO, Math.max(MIN_RATIO, height / width));
}

/** `post` and `embed` are server JSON stored as-is; read one string field without trusting the shape. */
function textField(json: Record<string, unknown> | null, field: string): string | null {
  const value = json?.[field];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Mathematical Alphanumeric Symbols: X's "bold" and "italic" letters, which no text face sets and TalkBack spells out. */
const MATH_LETTERS = /[\u{1D400}-\u{1D7FF}]/gu;

/** A post's words with those letters folded back into plain ones (#59). */
function plainLetters(text: string | null): string | null {
  return text?.replace(MATH_LETTERS, (letter) => letter.normalize('NFKC')) ?? null;
}

function variantOf(item: Item): CardVariant {
  if (item.status === 'failed') return 'failed';
  if (item.status !== 'ready') return 'pending';
  return item.kind ?? FALLBACK_KIND;
}

function opensApp(item: Item): boolean {
  return item.embed?.playable_inline === false;
}

function handleOf(item: Item): string | null {
  const handle = textField(item.post, 'handle');
  return handle ? `@${handle}` : null;
}

function authorOf(item: Item, variant: CardVariant): string | null {
  return variant === 'post' ? textField(item.post, 'author') : null;
}

/** When a post was written, in words; null when the server had no date (the oEmbed fallback) or a bad one. */
function postedWords(item: Item, now: Date): string | null {
  const postedAt = textField(item.post, 'posted_at');
  const posted = postedAt === null ? null : new Date(postedAt);
  return posted === null || Number.isNaN(posted.getTime()) ? null : dayWords(posted, now);
}

function noteFor(item: Item, variant: CardVariant, site: string, now: Date): string {
  const notes: Record<CardVariant, () => string> = {
    pending: () => FETCHING,
    failed: () => COULD_NOT_READ,
    article: () => joinNote([minutesNote(item.readingMin), site]),
    video: () => (opensApp(item) ? `opens in ${site}` : joinNote([durationNote(item.durationS), site])),
    post: () => joinNote(['post', postedWords(item, now) ?? site]),
    image: () => joinNote(['image', site]),
    link: () => site,
  };
  return notes[variant]();
}

function awaitsImage(item: Item, now: Date): boolean {
  if (item.imageUrl === null || item.updatedAt === null) return false;
  return now.getTime() - Date.parse(item.updatedAt) < IMAGE_WAIT_MS;
}

function mediaOf(item: Item, thumbUri: string | null, now: Date): CardMedia | null {
  const ratio = clampRatio({ width: item.thumbW, height: item.thumbH });
  if (ratio !== null && item.thumbW && item.thumbH) return { ratio, naturalRatio: item.thumbH / item.thumbW, uri: thumbUri };
  return awaitsImage(item, now) ? { ratio: WAITING_RATIO, naturalRatio: WAITING_RATIO, uri: null } : null;
}

/** Whether the note ends on this word, as `link · Aeon` ends on `Aeon` (and not on `eon`). */
function saysLast(note: string, part: string): boolean {
  return note === part || note.endsWith(` ${part}`);
}

type Described = Pick<CardModel, 'variant' | 'title' | 'site' | 'note' | 'byline' | 'channel'>;

/** Kind, byline, title, note (DESIGN.md §10), skipping what isn't known yet or the note already says. */
function describe(item: Item, { variant, title, site, note, byline, channel }: Described): string {
  const kind = variant === 'pending' ? null : (item.kind ?? FALLBACK_KIND);
  const unsaid = (part: string | null) => (part === null || saysLast(note, part) ? null : part);
  return [kind, unsaid(byline ?? channel), title ?? unsaid(site), note].filter((part) => part !== null).join(', ');
}

/** What a post print sets between its rules (#58): its words; a picture-only post has none when its name fills the rules. */
export function postWords(card: CardModel): string | null {
  if (card.postText) return card.postText;
  return card.media && card.byline ? null : (card.title ?? card.site);
}

/** Cards are rebuilt on every live-query refresh; this keeps unchanged ones from redrawing. */
export function sameCard(a: CardModel, b: CardModel): boolean {
  return (
    a.id === b.id &&
    a.url === b.url &&
    a.site === b.site &&
    a.variant === b.variant &&
    a.title === b.title &&
    a.note === b.note &&
    a.postText === b.postText &&
    a.byline === b.byline &&
    a.channel === b.channel &&
    a.handle === b.handle &&
    a.description === b.description &&
    a.media?.ratio === b.media?.ratio &&
    a.media?.naturalRatio === b.media?.naturalRatio &&
    a.media?.uri === b.media?.uri &&
    a.original === b.original &&
    a.accessibilityLabel === b.accessibilityLabel &&
    a.swatch?.light.colour === b.swatch?.light.colour &&
    a.swatch?.dark.colour === b.swatch?.dark.colour
  );
}

/** `now` decides whether a card still waits for its image (#34) and how a post's date is said (#58). */
export function toCardModel(item: Item, thumbUri: string | null, now: Date): CardModel {
  const variant = variantOf(item);
  const site = item.siteName ?? hostOf(item.sourceUrl);
  const title = item.title ?? item.sharedTitle ?? null;
  const note = noteFor(item, variant, site, now);
  const author = authorOf(item, variant);
  const handle = variant === 'post' ? handleOf(item) : null;
  const byline = author ?? handle;
  const channel = variant === 'video' ? item.author : null;
  return {
    id: item.id,
    url: item.sourceUrl,
    variant,
    title,
    site,
    note,
    media: variant === 'pending' ? null : mediaOf(item, thumbUri, now),
    original: item.imageUrl,
    postText: plainLetters(textField(item.post, 'text')),
    byline,
    author,
    handle,
    channel,
    description: item.description,
    accessibilityLabel: describe(item, { variant, title, site, note, byline, channel }),
    swatch: null,
  };
}
