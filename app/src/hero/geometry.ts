import { mediaHeight } from '../feed/feedLayout.ts';

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

/** Where a feed page draws its media: whole images fit inside the box, everything else fills it (#31). */
export type Landing = { readonly fit: 'contain'; readonly ratio: number } | { readonly fit: 'cover' };

export type Axis = 'x' | 'y';

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

/** The rect a flight to (or from) the feed uses, so the swap with the real image is pixel-identical. */
export function landingRect(feed: Size, landing: Landing): Rect {
  const box = feedMediaRect(feed);
  return landing.fit === 'contain' ? fittedRect(box, landing.ratio) : box;
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
