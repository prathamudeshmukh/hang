// The app icon (#74) as SVG: a masonry of colour tiles, the colour standing in for what people save. Rendered to PNGs by buildIcon.ts.
import { PALETTES } from '../../src/theme/tokens.ts';

/** The adaptive icon's 108dp layer, drawn at 1024 units. */
export const CANVAS = 1024;
const CENTRE = CANVAS / 2;
// Launchers may crop the layer to any shape inside its middle 66dp.
const SAFE_RADIUS = (CANVAS * 66) / 108 / 2;

/** The icon's own colours: the stand-ins for what people save, on the Sage wall. */
export const ICON_COLOURS = {
  wall: PALETTES.light.wall,
  vermilion: PALETTES.light.accent,
  ochre: '#D9A441',
  teal: '#2F7F7A',
  rose: '#D98B8B',
  blue: '#2E4A7D',
  sage: '#9FB3A3',
} as const;

export interface Tile {
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
}

export interface IconDesign {
  /** Full colour; may bleed past the safe zone (the launcher crops it). */
  foreground: readonly Tile[];
  /** Themed icons (Android 13+): one ink, inside the safe zone. */
  monochrome: readonly Tile[];
  /** The Android 12+ splash icon: inside the safe zone. */
  splash: readonly Tile[];
}

export interface SvgOptions {
  background?: string;
  /** Paints every tile this one colour (the monochrome layer). */
  ink?: string;
}

const { wall, vermilion, ochre, teal, rose, blue, sage } = ICON_COLOURS;
const TILE_RADIUS = 6;

// Inside the safe zone: the same masonry, four tiles.
const MOSAIC_INSET: readonly Tile[] = [
  { x: 352, y: 352, width: 150, height: 170, fill: ochre },
  { x: 352, y: 538, width: 150, height: 134, fill: teal },
  { x: 518, y: 352, width: 154, height: 110, fill: blue },
  { x: 518, y: 478, width: 154, height: 194, fill: vermilion },
];

/** The mosaic: what you keep, as colour (chosen on the phone, 2026-11-18). */
export const HANG_ICON: IconDesign = {
  foreground: [
    { x: 0, y: 0, width: 502, height: 430, fill: ochre },
    { x: 0, y: 450, width: 502, height: 250, fill: teal },
    { x: 0, y: 720, width: 502, height: 304, fill: rose },
    { x: 522, y: 0, width: 502, height: 300, fill: blue },
    { x: 522, y: 320, width: 502, height: 320, fill: vermilion },
    { x: 522, y: 660, width: 502, height: 364, fill: sage },
  ],
  monochrome: MOSAIC_INSET,
  splash: MOSAIC_INSET,
};

/** The adaptive icon's background layer: the gutters between tiles. */
export const ICON_BACKGROUND = wall;

function corners({ x, y, width, height }: Tile): { x: number; y: number }[] {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

/** True when the whole tile survives every launcher mask. */
export function insideSafeZone(tile: Tile): boolean {
  return corners(tile).every(({ x, y }) => Math.hypot(x - CENTRE, y - CENTRE) <= SAFE_RADIUS);
}

function tileSvg(tile: Tile, ink: string | undefined): string {
  return `<rect x="${tile.x}" y="${tile.y}" width="${tile.width}" height="${tile.height}" rx="${TILE_RADIUS}" fill="${ink ?? tile.fill}"/>`;
}

export function tilesSvg(tiles: readonly Tile[], { background, ink }: SvgOptions = {}): string {
  const backdrop = background ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${background}"/>` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}">` +
    backdrop +
    tiles.map((tile) => tileSvg(tile, ink)).join('') +
    `</svg>`
  );
}
