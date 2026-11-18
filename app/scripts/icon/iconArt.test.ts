import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HANG_ICON, insideSafeZone, tilesSvg, type Tile } from './iconArt.ts';

const SQUARE: Tile = { x: 400, y: 400, width: 100, height: 100, fill: '#C23B20' };

function fillsIn(svg: string): Set<string> {
  return new Set([...svg.matchAll(/fill="([^"]+)"/g)].map((match) => match[1]));
}

describe('safe zone', () => {
  it('keeps the tiles a launcher may crop inside the 66dp circle', () => {
    const cropped = [...HANG_ICON.monochrome, ...HANG_ICON.splash];

    assert.ok(cropped.every(insideSafeZone));
  });

  it('lets the full-colour mosaic bleed past the circle', () => {
    assert.equal(HANG_ICON.foreground.every(insideSafeZone), false);
  });

  it('notices a tile that reaches past the circle', () => {
    const corner: Tile = { x: 0, y: 0, width: 100, height: 100, fill: '#000' };

    assert.equal(insideSafeZone(corner), false);
  });
});

describe('tilesSvg', () => {
  it('paints a background only when one is given', () => {
    const bare = tilesSvg([SQUARE]);
    const backed = tilesSvg([SQUARE], { background: '#EDF0EA' });

    assert.equal(fillsIn(bare).has('#EDF0EA'), false);
    assert.equal(fillsIn(backed).has('#EDF0EA'), true);
  });

  it('draws every tile in one ink for the monochrome layer', () => {
    const svg = tilesSvg(HANG_ICON.monochrome, { ink: '#000000' });

    assert.deepEqual([...fillsIn(svg)], ['#000000']);
  });

  it('draws on the 1024 adaptive canvas', () => {
    assert.match(tilesSvg([SQUARE]), /viewBox="0 0 1024 1024"/);
  });
});
