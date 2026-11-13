import { centringShift, isInsideAlong, type Axis, type Rect } from './geometry.ts';

/** A list jumps, then FlashList needs a few frames to mount and lay out the cell it recycled. */
const MOUNT_FRAMES = 6;
/** Masonry re-lays out cells it only estimated before the jump; give it this long to settle. */
const SETTLE_FRAMES = 10;

type Measure = () => Promise<Rect | null>;

/** One scroll container the print sits in, scrolled along one axis. */
export interface ScrollerStep {
  readonly axis: Axis;
  readonly viewport: () => Promise<Rect | null>;
  readonly scrollBy: (delta: number) => void;
}

interface ScrollersReveal {
  readonly face: Measure;
  /** Innermost first: the strip, then the page it's on. */
  readonly steps: readonly ScrollerStep[];
  readonly nextFrame: () => Promise<void>;
}

/**
 * Brings an always-mounted print fully into view, one scroller at a time, centring it only where it's
 * cut off (#32 decision 4). Runs under the opaque feed, so the jumps are never seen.
 */
export async function revealInScrollers({ face, steps, nextFrame }: ScrollersReveal): Promise<Rect | null> {
  for (const step of steps) {
    const [rect, viewport] = await Promise.all([face(), step.viewport()]);
    if (!rect || !viewport) return null;
    if (isInsideAlong(rect, viewport, step.axis)) continue;
    step.scrollBy(centringShift(rect, viewport, step.axis));
    await nextFrame();
  }
  return face();
}

interface ListReveal {
  /** The item's position in the list as shown; -1 when it isn't on this wall any more. */
  readonly index: number;
  readonly face: Measure;
  readonly viewport: () => Promise<Rect | null>;
  /** Jump (no animation) so the item sits in the middle of the list. */
  readonly jumpTo: (index: number) => void;
  readonly nextFrame: () => Promise<void>;
}

const sameRect = (a: Rect | null, b: Rect | null) =>
  a !== null && b !== null && a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;

async function waitForMount(face: Measure, nextFrame: () => Promise<void>): Promise<Rect | null> {
  for (let frame = 0; frame < MOUNT_FRAMES; frame += 1) {
    await nextFrame();
    const rect = await face();
    if (rect) return rect;
  }
  return null;
}

/** The rect once two frames in a row agree, so a flight back lands where the card ends up, not where it was. */
async function waitForStill(first: Rect, face: Measure, nextFrame: () => Promise<void>): Promise<Rect | null> {
  let previous: Rect | null = first;
  for (let frame = 0; frame < SETTLE_FRAMES; frame += 1) {
    await nextFrame();
    const rect = await face();
    if (sameRect(rect, previous)) return rect;
    previous = rect;
  }
  return previous;
}

/** The same for a virtualised wall, whose card may not be mounted at all until the list jumps to it. */
export async function revealInList({ index, face, viewport, jumpTo, nextFrame }: ListReveal): Promise<Rect | null> {
  if (index < 0) return null;
  const [rect, view] = await Promise.all([face(), viewport()]);
  if (rect && view && isInsideAlong(rect, view, 'y')) return rect;
  jumpTo(index);
  const mounted = await waitForMount(face, nextFrame);
  return mounted ? waitForStill(mounted, face, nextFrame) : null;
}
