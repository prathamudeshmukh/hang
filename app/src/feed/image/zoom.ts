/**
 * The image page's zoom (#60), as plain numbers so the gestures' worklets and the tests share it.
 * A view is the image's scale and its centre's offset from the page centre; the image is drawn whole
 * (`contain`) at scale 1 and transformed about its centre.
 */
export const ZOOM = {
  max: 5,
  doubleTap: 2.5,
  /** Past this the thumbnail (1080px wide) starts to blur, so the original is fetched. */
  original: 1.2,
  /** How much of a pan past an edge still moves the image, before it springs back. */
  give: 0.25,
} as const;

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface View {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

export const REST: View = { scale: 1, x: 0, y: 0 };

/** The image drawn whole on the page; `ratio` is its height over width. */
export function fittedSize(page: Size, ratio: number): Size {
  'worklet';
  if (!(ratio > 0)) return page;
  const height = Math.min(page.height, page.width * ratio);
  return { width: height / ratio, height };
}

export function clampScale(scale: number): number {
  'worklet';
  return Math.min(ZOOM.max, Math.max(1, scale));
}

/** An image taller than the page zooms until it fills the width, so one double-tap gives a readable column. */
export function doubleTapScale(page: Size, ratio: number): number {
  'worklet';
  const fitted = fittedSize(page, ratio);
  const fillsWidth = fitted.width >= page.width;
  return fillsWidth ? ZOOM.doubleTap : clampScale(page.width / fitted.width);
}

/** How far the image's centre may move from the page's before an edge comes away from the page's. */
export function panLimit(page: Size, fitted: Size, scale: number): Point {
  'worklet';
  return {
    x: Math.max(0, (fitted.width * scale - page.width) / 2),
    y: Math.max(0, (fitted.height * scale - page.height) / 2),
  };
}

/** Rescale so the image point under `focal` (relative to the page centre) stays under it. */
export function zoomAt(view: View, focal: Point, scale: number): View {
  'worklet';
  const grow = scale / view.scale;
  return { scale, x: focal.x - grow * (focal.x - view.x), y: focal.y - grow * (focal.y - view.y) };
}

function clamp(value: number, limit: number): number {
  'worklet';
  return Math.min(limit, Math.max(-limit, value));
}

/** Where a view comes to rest when the fingers lift: scale within limits, edges on the page. */
export function settledView(view: View, page: Size, ratio: number): View {
  'worklet';
  const scale = clampScale(view.scale);
  if (scale === 1) return REST;
  const limit = panLimit(page, fittedSize(page, ratio), scale);
  return { scale, x: clamp(view.x, limit.x), y: clamp(view.y, limit.y) };
}

/** A pan past an edge moves the image only a little, so the edge is felt. */
export function withGive(value: number, limit: number): number {
  'worklet';
  const beyond = Math.abs(value) - limit;
  if (beyond <= 0) return value;
  return Math.sign(value) * (limit + beyond * ZOOM.give);
}

export function wantsOriginal(scale: number): boolean {
  'worklet';
  return scale > ZOOM.original;
}
