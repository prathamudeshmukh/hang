import { mediaHeight } from '../feed/feedLayout.ts';
import { wordsPlace, type PostFrame } from '../feed/post/postLayout.ts';
import { textPlace, type TextFrame } from '../feed/text/textLayout.ts';

/** A window rect, as measureInWindow reports it. */
export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

/** The feed as laid out: its size, where a post page's words begin (#59) and where a text page's block sits (#61). */
export type FeedFrame = PostFrame & TextFrame;

/**
 * Where a feed page draws its media: an image fits whole on the page (#60), a picture sits in the box as `mediaFit`
 * places it (#95), a text face fills the box (#31); a post lands on its words' place instead (#59), an imageless
 * article on its text block (#61), a label page on the whole page (#109).
 */
export type Landing =
  | { readonly fit: 'contain'; readonly ratio: number }
  | { readonly fit: 'media'; readonly ratio: number }
  | { readonly fit: 'cover' }
  | { readonly fit: 'words' }
  | { readonly fit: 'text' }
  | { readonly fit: 'page' };

export type Axis = 'x' | 'y';

/** The whole page: an image page draws its image fitted to it (#60). */
export function feedPageRect(feed: Size): Rect {
  return { x: 0, y: 0, width: feed.width, height: feed.height };
}

/** The feed fills the window edge to edge, so its media box starts at the window's top-left. */
export function feedMediaRect(feed: Size): Rect {
  return { x: 0, y: 0, width: feed.width, height: mediaHeight(feed.height) };
}

/** An image of this height/width ratio drawn whole and centred in the box (contentFit "contain"). */
export function fittedRect(box: Rect, ratio: number): Rect {
  if (!(ratio > 0)) return box;
  const height = Math.min(box.height, box.width * ratio);
  const width = height / ratio;
  return { x: box.x + (box.width - width) / 2, y: box.y + (box.height - height) / 2, width, height };
}

/** How much of a picture's width cover may cut before the feed draws it whole instead (#95): thin bands look like a mistake. */
export const COVER_CROP_LIMIT = 0.1;

/** How a feed page draws a picture in its media box: cropped to fill it, or whole at this rect (#95). */
export type MediaFit = { readonly fit: 'cover' } | { readonly fit: 'whole'; readonly rect: Rect };

const COVER: MediaFit = { fit: 'cover' };

/** Wider pictures are drawn whole, centred; taller ones and near-fits keep cover, cropped from the bottom. */
export function mediaFit(box: Rect, ratio: number): MediaFit {
  if (!(ratio > 0)) return COVER;
  const coverCrop = 1 - (box.width * ratio) / box.height;
  return coverCrop > COVER_CROP_LIMIT ? { fit: 'whole', rect: fittedRect(box, ratio) } : COVER;
}

function pictureRect(box: Rect, ratio: number): Rect {
  const placed = mediaFit(box, ratio);
  return placed.fit === 'whole' ? placed.rect : box;
}

/** The rect a flight to (or from) the feed uses, so the swap with the real image is pixel-identical. */
export function landingRect(feed: FeedFrame, landing: Landing, print: Rect): Rect {
  if (landing.fit === 'words') return wordsPlace(feed, print.height / print.width);
  if (landing.fit === 'text') return textPlace(feed);
  if (landing.fit === 'page') return feedPageRect(feed);
  if (landing.fit === 'contain') return fittedRect(feedPageRect(feed), landing.ratio);
  if (landing.fit === 'media') return pictureRect(feedMediaRect(feed), landing.ratio);
  return feedMediaRect(feed);
}

const SIZE_OF: Readonly<Record<Axis, 'width' | 'height'>> = { x: 'width', y: 'height' };

/** Whether the rect is wholly inside the viewport along one axis (a strip only scrolls across). */
export function isInsideAlong(rect: Rect, viewport: Rect, axis: Axis): boolean {
  const size = SIZE_OF[axis];
  return rect[axis] >= viewport[axis] && rect[axis] + rect[size] <= viewport[axis] + viewport[size];
}

export function isFullyInside(rect: Rect, viewport: Rect): boolean {
  return isInsideAlong(rect, viewport, 'x') && isInsideAlong(rect, viewport, 'y');
}

/** How far to scroll along one axis to bring the rect's centre to the viewport's centre. */
export function centringShift(rect: Rect, viewport: Rect, axis: Axis): number {
  const size = SIZE_OF[axis];
  return rect[axis] + rect[size] / 2 - (viewport[axis] + viewport[size] / 2);
}

export interface Insets {
  readonly top: number;
  readonly bottom: number;
}

/** The part of a viewport not under the system bars: a card behind the nav bar isn't fully visible. */
export function insetRect(rect: Rect, { top, bottom }: Insets): Rect {
  return { ...rect, y: rect.y + top, height: Math.max(0, rect.height - top - bottom) };
}
