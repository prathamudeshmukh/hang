// The app icon (#74) as SVG: a masonry of colour tiles, the colour standing in for what people save. Rendered to PNGs by buildIcon.ts.
import { MARK_COLOURS, MARK_TILES, MOSAIC_TILES, TILE_RADIUS, type Tile } from '../../src/theme/hangMark.ts';

export type { Tile };

/** The adaptive icon's 108dp layer, drawn at 1024 units. */
export const CANVAS = 1024;
const CENTRE = CANVAS / 2;
// Launchers may crop the layer to any shape inside its middle 66dp.
const SAFE_RADIUS = (CANVAS * 66) / 108 / 2;

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

/** The mosaic: what you keep, as colour (chosen on the phone, 2026-11-18). */
export const HANG_ICON: IconDesign = { foreground: MOSAIC_TILES, monochrome: MARK_TILES, splash: MARK_TILES };

/** The adaptive icon's background layer: the gutters between tiles. */
export const ICON_BACKGROUND = MARK_COLOURS.wall;

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
