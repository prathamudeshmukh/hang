/** Hang's mark (#74): a masonry of colour tiles. The app icon (scripts/icon) and <HangMark> both draw these. */
import { PALETTES } from './tokens.ts';

/** The icon's own colours: stand-ins for what people save, on the Sage wall. */
export const MARK_COLOURS = {
  wall: PALETTES.light.wall,
  vermilion: PALETTES.light.accent,
  ochre: '#D9A441',
  teal: '#2F7F7A',
  rose: '#D98B8B',
  blue: '#2E4A7D',
  sage: '#9FB3A3',
} as const;

/** On the icon's 1024-unit canvas (the 108dp adaptive layer). */
export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export const TILE_RADIUS = 6;

const { vermilion, ochre, teal, rose, blue, sage } = MARK_COLOURS;

/** The full mosaic, bleeding past the canvas edge for the launcher to crop. */
export const MOSAIC_TILES: readonly Tile[] = [
  { x: 0, y: 0, width: 502, height: 430, fill: ochre },
  { x: 0, y: 450, width: 502, height: 250, fill: teal },
  { x: 0, y: 720, width: 502, height: 304, fill: rose },
  { x: 522, y: 0, width: 502, height: 300, fill: blue },
  { x: 522, y: 320, width: 502, height: 320, fill: vermilion },
  { x: 522, y: 660, width: 502, height: 364, fill: sage },
];

/** The same masonry as four tiles: the mark itself (themed icon, splash, in the app). */
export const MARK_TILES: readonly Tile[] = [
  { x: 352, y: 352, width: 150, height: 170, fill: ochre },
  { x: 352, y: 538, width: 150, height: 134, fill: teal },
  { x: 518, y: 352, width: 154, height: 110, fill: blue },
  { x: 518, y: 478, width: 154, height: 194, fill: vermilion },
];

export interface MarkBounds {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** The box that fits the tiles exactly. */
export function markBounds(tiles: readonly Tile[]): MarkBounds {
  if (tiles.length === 0) throw new Error('A mark with no tiles has no bounds');
  const left = Math.min(...tiles.map((tile) => tile.x));
  const top = Math.min(...tiles.map((tile) => tile.y));
  const right = Math.max(...tiles.map((tile) => tile.x + tile.width));
  const bottom = Math.max(...tiles.map((tile) => tile.y + tile.height));
  return { left, top, width: right - left, height: bottom - top };
}

/** The SVG viewBox that fits the tiles exactly. */
export function markViewBox(tiles: readonly Tile[]): string {
  const { left, top, width, height } = markBounds(tiles);
  return `${left} ${top} ${width} ${height}`;
}
