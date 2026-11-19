/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HOWTO_ART_SIZE, howtoArt, type Shape } from './howtoShapes.ts';

const STEPS = [0, 1, 2] as const;

function bounds(shape: Shape): readonly [number, number, number, number] | null {
  switch (shape.kind) {
    case 'rect': return [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height];
    case 'circle': return [shape.cx - shape.r, shape.cy - shape.r, shape.cx + shape.r, shape.cy + shape.r];
    case 'line': return [Math.min(shape.x1, shape.x2), Math.min(shape.y1, shape.y2), Math.max(shape.x1, shape.x2), Math.max(shape.y1, shape.y2)];
    case 'tile': return [shape.x, shape.y, shape.x + shape.width, shape.y + shape.height];
    case 'path': return null;
  }
}

const inside = (shape: Shape) => (bounds(shape) ?? [0, 0, 0, 0]).every((edge) => edge >= 0 && edge <= HOWTO_ART_SIZE);

describe('howtoShapes (#75)', () => {
  it('keeps every shape of every step inside the print', () => {
    const outside = STEPS.flatMap((step) => howtoArt(step).filter((shape) => !inside(shape)).map((shape) => `step ${step + 1}: ${JSON.stringify(shape)}`));
    assert.deepEqual(outside, []);
  });

  it('carries the same sample picture through all three steps', () => {
    assert.deepEqual(STEPS.map((step) => howtoArt(step).some((shape) => shape.kind === 'rect' && shape.ink === 'picture')), [true, true, true]);
  });

  it('shows the Share button in ink only on step 2', () => {
    const hasButton = (step: 0 | 1 | 2) => howtoArt(step).some((shape) => shape.kind === 'circle' && shape.ink === 'ink');
    assert.deepEqual(STEPS.map(hasButton), [false, true, false]);
  });

  it('puts Hang\'s mark, all four tiles, in the share row on the lower half of step 3', () => {
    const tiles = howtoArt(2).filter((shape) => shape.kind === 'tile');
    assert.equal(tiles.length, 4);
    assert.ok(tiles.every((tile) => tile.y > HOWTO_ART_SIZE / 2));
  });

  it('draws the mark inside Hang\'s circle in the share row', () => {
    const tiles = howtoArt(2).filter((shape) => shape.kind === 'tile');
    const disc = howtoArt(2).find((shape) => shape.kind === 'circle' && shape.ink === 'wall');
    assert.ok(disc?.kind === 'circle' && tiles.every((tile) => Math.hypot(tile.x - disc.cx, tile.y - disc.cy) < disc.r));
  });

  it('draws no mark before step 3', () => {
    assert.deepEqual([0, 1].map((step) => howtoArt(step as 0 | 1).some((shape) => shape.kind === 'tile')), [false, false]);
  });
});
