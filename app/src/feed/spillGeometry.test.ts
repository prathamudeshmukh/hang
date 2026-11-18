/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { spillRect, SPILL } from './spillGeometry.ts';

describe('projector spill', () => {
  it('starts at the foot of the media box and runs part way down the page', () => {
    const rect = spillRect({ pageHeight: 800, mediaHeight: 448 });
    assert.deepEqual([rect.top, rect.height], [448, Math.round(352 * SPILL.reach)]);
  });

  it('draws nothing when the media box leaves no room below it', () => {
    assert.equal(spillRect({ pageHeight: 400, mediaHeight: 400 }).height, 0);
  });

  it('never runs above the media box for a negative page', () => {
    assert.equal(spillRect({ pageHeight: 0, mediaHeight: 10 }).height, 0);
  });
});
