/**
 * The empty Home's three how-to drawings (#75, design/explorations/13 layout 4) as plain shapes on a square
 * print, so the geometry is tested here and `HowToArt` only draws it. Colours are named, not given: `HowToArt`
 * resolves them from the theme's palette and its `SKETCH` palette.
 */
import { MARK_TILES, markBounds, TILE_RADIUS } from '../../theme/hangMark.ts';
import type { SketchPalette } from '../../theme/tokens.ts';

/** The drawings' own units; `HowToArt` scales them to whatever size it's given. */
export const HOWTO_ART_SIZE = 96;

export type SketchInk = keyof SketchPalette | 'ink' | 'ink2' | 'raised' | 'wall';

interface Painted {
  readonly ink: SketchInk;
  readonly opacity?: number;
}

export type Shape =
  | (Painted & { readonly kind: 'rect'; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number })
  | (Painted & { readonly kind: 'circle'; readonly cx: number; readonly cy: number; readonly r: number; readonly outline?: SketchInk })
  | (Painted & { readonly kind: 'line'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number; readonly width: number })
  | (Painted & { readonly kind: 'path'; readonly d: string })
  /** One of Hang's mark tiles, in the icon's own colour on both walls. */
  | { readonly kind: 'tile'; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number; readonly fill: string };

export type HowToStep = 0 | 1 | 2;

/** Every step, in the order the how-to hangs them; `howtoCopy` has one entry for each. */
export const HOWTO_STEP_ORDER: readonly HowToStep[] = [0, 1, 2];

const S = HOWTO_ART_SIZE;
/** Margin inside the print, and the size of the app bar's buttons. */
const M = S * 0.09;
const BUTTON = M * 1.1;
const PICTURE = { x: M, y: M * 2 + BUTTON, width: S - 2 * M, height: (S - (M * 2 + BUTTON)) * 0.55 } as const;
const HEADLINE_Y = PICTURE.y + PICTURE.height + M;
/** Step 2's page sits back so the Share button reads first; step 3's sits further back, under the sheet. */
const PAGE_BEHIND_BUTTON = 0.45;
const PAGE_BEHIND_SHEET = 0.3;
const HALO_SCALE = 1.5;
/** The share sheet: its rounded top, and the drag handle on it. */
const SHEET_CORNER = S * 0.1;
const HANDLE = { width: S * 0.2, height: S * 0.03, inset: S * 0.05 } as const;

interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A landscape: the washed picture with two hills and a sun. */
function picture({ x, y, width, height }: Box, opacity?: number): readonly Shape[] {
  const hills = `M${x} ${y + height} L${x + width * 0.3} ${y + height * 0.45} L${x + width * 0.47} ${y + height * 0.7} L${x + width * 0.64} ${y + height * 0.38} L${x + width} ${y + height} Z`;
  return [
    { kind: 'rect', x, y, width, height, radius: 2, ink: 'picture', opacity },
    { kind: 'path', d: hills, ink: 'pictureShade', opacity },
    { kind: 'circle', cx: x + width * 0.8, cy: y + height * 0.24, r: Math.min(width, height) * 0.1, ink: 'pictureShade', opacity },
  ];
}

/** Another app's page: a back button, an overflow button (unless Share takes its place), the picture, a headline, a line. */
function page({ opacity, withMenu }: { readonly opacity?: number; readonly withMenu: boolean }): readonly Shape[] {
  const menu: readonly Shape[] = withMenu ? [{ kind: 'circle', cx: S - M - BUTTON / 2, cy: M + BUTTON / 2, r: BUTTON / 2, ink: 'firm', opacity }] : [];
  return [
    { kind: 'rect', x: M, y: M, width: BUTTON, height: BUTTON, radius: 2, ink: 'firm', opacity },
    ...menu,
    ...picture(PICTURE, opacity),
    { kind: 'rect', x: M, y: HEADLINE_Y, width: PICTURE.width * 0.75, height: M * 0.8, radius: 2, ink: 'firm', opacity },
    { kind: 'rect', x: M, y: HEADLINE_Y + M * 1.5, width: PICTURE.width * 0.55, height: M * 0.5, radius: M * 0.25, ink: 'faint', opacity },
  ];
}

/** Android's share glyph: three dots joined by two strokes. */
function shareGlyph(cx: number, cy: number, r: number): readonly Shape[] {
  const ends = [[cx + r * 0.55, cy - r * 0.7], [cx - r * 0.65, cy], [cx + r * 0.55, cy + r * 0.7]] as const;
  const stroke = r * 0.24;
  return [
    { kind: 'line', x1: ends[0][0], y1: ends[0][1], x2: ends[1][0], y2: ends[1][1], width: stroke, ink: 'raised' },
    { kind: 'line', x1: ends[1][0], y1: ends[1][1], x2: ends[2][0], y2: ends[2][1], width: stroke, ink: 'raised' },
    ...ends.map(([x, y]): Shape => ({ kind: 'circle', cx: x, cy: y, r: r * 0.28, ink: 'raised' })),
  ];
}

function shareStep(): readonly Shape[] {
  const r = S * 0.1;
  const halo = r * HALO_SCALE;
  const cx = S - halo;
  const cy = halo + M * 0.2;
  return [
    ...page({ opacity: PAGE_BEHIND_BUTTON, withMenu: false }),
    { kind: 'circle', cx, cy, r: halo, ink: 'halo' },
    { kind: 'circle', cx, cy, r, ink: 'ink' },
    ...shareGlyph(cx, cy, r * 0.52),
  ];
}

const MARK_BOX = markBounds(MARK_TILES);

/** Hang's mark as its four tiles, scaled into a square of `size` centred on (cx, cy). */
function mark(cx: number, cy: number, size: number): readonly Shape[] {
  const scale = size / Math.max(MARK_BOX.width, MARK_BOX.height);
  return MARK_TILES.map((tile): Shape => ({
    kind: 'tile',
    x: cx - size / 2 + (tile.x - MARK_BOX.left) * scale,
    y: cy - size / 2 + (tile.y - MARK_BOX.top) * scale,
    width: tile.width * scale,
    height: tile.height * scale,
    radius: TILE_RADIUS * scale,
    fill: tile.fill,
  }));
}

/** The share row: two other apps, Hang (tapped), then More. */
function shareRow(cy: number, r: number): readonly Shape[] {
  const [first, hang, third, more] = [0.17, 0.39, 0.61, 0.83].map((fraction) => S * fraction);
  const moreDots = [-1, 0, 1].map((step): Shape => ({ kind: 'circle', cx: more + step * r * 0.38, cy, r: r * 0.12, ink: 'ink2' }));
  return [
    { kind: 'circle', cx: first, cy, r, ink: 'firm' },
    { kind: 'circle', cx: hang, cy, r: r * HALO_SCALE, ink: 'halo' },
    { kind: 'circle', cx: hang, cy, r, ink: 'wall', outline: 'firm' },
    ...mark(hang, cy, r * 1.1),
    { kind: 'circle', cx: third, cy, r, ink: 'firm' },
    { kind: 'circle', cx: more, cy, r, ink: 'faint' },
    ...moreDots,
  ];
}

function sheetStep(): readonly Shape[] {
  const top = S * 0.44;
  const rest = S - top;
  const corner = SHEET_CORNER;
  const sheet = `M0 ${S} V${top + corner} Q0 ${top} ${corner} ${top} H${S - corner} Q${S} ${top} ${S} ${top + corner} V${S} Z`;
  const preview = { x: M, y: top + rest * 0.14, width: rest * 0.26, height: rest * 0.2 };
  const textX = preview.x + preview.width + M * 0.8;
  return [
    { kind: 'rect', x: 0, y: 0, width: S, height: S, radius: 0, ink: 'faint' },
    ...page({ opacity: PAGE_BEHIND_SHEET, withMenu: true }),
    { kind: 'path', d: sheet, ink: 'sheet' },
    { kind: 'rect', x: (S - HANDLE.width) / 2, y: top + HANDLE.inset, width: HANDLE.width, height: HANDLE.height, radius: HANDLE.height / 2, ink: 'firm' },
    ...picture(preview),
    { kind: 'rect', x: textX, y: preview.y + preview.height * 0.12, width: S * 0.4, height: preview.height * 0.28, radius: preview.height * 0.14, ink: 'ink2' },
    { kind: 'rect', x: textX, y: preview.y + preview.height * 0.58, width: S * 0.26, height: preview.height * 0.22, radius: preview.height * 0.11, ink: 'firm' },
    ...shareRow(top + rest * 0.68, Math.min(S * 0.085, rest * 0.17)),
  ];
}

const STEP_ART: Readonly<Record<HowToStep, readonly Shape[]>> = {
  0: page({ withMenu: true }),
  1: shareStep(),
  2: sheetStep(),
};

export function howtoArt(step: HowToStep): readonly Shape[] {
  return STEP_ART[step];
}
