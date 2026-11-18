// Renders the app icon's PNGs into assets/images (#74). Usage: npm run icon
import { writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { HANG_ICON, ICON_BACKGROUND, type IconDesign, tilesSvg } from './iconArt.ts';

const OUT_DIR = join(import.meta.dirname, '..', '..', 'assets', 'images');
const MONOCHROME_INK = '#000000';

export type IconLayers = Readonly<Record<string, string>>;

/** Each image app.json names, as SVG. */
export function iconLayers(design: IconDesign): IconLayers {
  return {
    'icon.png': tilesSvg(design.foreground, { background: ICON_BACKGROUND }),
    'android-icon-foreground.png': tilesSvg(design.foreground),
    'android-icon-monochrome.png': tilesSvg(design.monochrome, { ink: MONOCHROME_INK }),
    'splash-icon.png': tilesSvg(design.splash),
  };
}

export function renderPng(svg: string): Buffer {
  return new Resvg(svg).render().asPng();
}

function main(): void {
  for (const [file, svg] of Object.entries(iconLayers(HANG_ICON))) {
    writeFileSync(join(OUT_DIR, file), renderPng(svg));
  }
  process.stdout.write(`Wrote the icon to ${OUT_DIR}\n`);
}

// Node 22 has no import.meta.main.
const runDirectly = process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (runDirectly) main();
