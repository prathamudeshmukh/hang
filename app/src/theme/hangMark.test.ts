import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MARK_TILES, markViewBox, type Tile } from './hangMark.ts';

describe('markViewBox', () => {
  it('frames the four-tile mark with no margin', () => {
    assert.equal(markViewBox(MARK_TILES), '352 352 320 320');
  });

  it('spans every tile, wherever it sits', () => {
    const tiles: Tile[] = [
      { x: 10, y: 40, width: 20, height: 10, fill: '#000' },
      { x: 50, y: 0, width: 5, height: 100, fill: '#000' },
    ];

    assert.equal(markViewBox(tiles), '10 0 45 100');
  });

  it('refuses a mark with no tiles', () => {
    assert.throws(() => markViewBox([]), /no tiles/);
  });
});
