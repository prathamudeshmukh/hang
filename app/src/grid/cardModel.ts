import type { Item, ItemKind } from '../db/schema.ts';
import { hostOf } from './host.ts';
import { durationNote, joinNote, minutesNote } from './catalogueNote.ts';

/** Height over width. Taller is cropped from the top, wider from both sides (#29). */
export const MIN_RATIO = 0.5;
export const MAX_RATIO = 1.6;

const FETCHING = 'fetching…';
const COULD_NOT_READ = 'couldn’t read this';
const FALLBACK_KIND: ItemKind = 'link';

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
  readonly postText: string | null;
  readonly accessibilityLabel: string;
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

function variantOf(item: Item): CardVariant {
  if (item.status === 'failed') return 'failed';
  if (item.status !== 'ready') return 'pending';
  return item.kind ?? FALLBACK_KIND;
}

function opensApp(item: Item): boolean {
  return item.embed?.playable_inline === false;
}

function noteFor(item: Item, variant: CardVariant, site: string): string {
  const handle = textField(item.post, 'handle');
  const notes: Record<CardVariant, () => string> = {
    pending: () => FETCHING,
    failed: () => COULD_NOT_READ,
    article: () => joinNote([minutesNote(item.readingMin), site]),
    video: () => (opensApp(item) ? `opens in ${site}` : joinNote([durationNote(item.durationS), site])),
    post: () => joinNote(['post', handle ? `@${handle}` : site]),
    image: () => joinNote(['image', site]),
    link: () => site,
  };
  return notes[variant]();
}

function mediaOf(item: Item, thumbUri: string | null): CardMedia | null {
  const ratio = clampRatio({ width: item.thumbW, height: item.thumbH });
  if (ratio === null || !item.thumbW || !item.thumbH) return null;
  return { ratio, naturalRatio: item.thumbH / item.thumbW, uri: thumbUri };
}

/** Kind, title, note (DESIGN.md §10), skipping what isn't known yet or is already said. */
function describe(item: Item, { variant, title, site, note }: Pick<CardModel, 'variant' | 'title' | 'site' | 'note'>): string {
  const kind = variant === 'pending' ? null : (item.kind ?? FALLBACK_KIND);
  const name = title ?? (note.includes(site) ? null : site);
  return [kind, name, note].filter((part) => part !== null).join(', ');
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
    a.media?.ratio === b.media?.ratio &&
    a.media?.naturalRatio === b.media?.naturalRatio &&
    a.media?.uri === b.media?.uri &&
    a.accessibilityLabel === b.accessibilityLabel
  );
}

export function toCardModel(item: Item, thumbUri: string | null): CardModel {
  const variant = variantOf(item);
  const site = item.siteName ?? hostOf(item.sourceUrl);
  const title = item.title ?? item.sharedTitle ?? null;
  const note = noteFor(item, variant, site);
  return {
    id: item.id,
    url: item.sourceUrl,
    variant,
    title,
    site,
    note,
    media: variant === 'pending' ? null : mediaOf(item, thumbUri),
    postText: textField(item.post, 'text'),
    accessibilityLabel: describe(item, { variant, title, site, note }),
  };
}
