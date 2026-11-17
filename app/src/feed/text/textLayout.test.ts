/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { SPACE } from '../../theme/tokens.ts';
import { openingLines, TEXT_PILLS_GAP, textBlockBottom, textBlockTop, textPlace } from './textLayout.ts';

describe('openingLines', () => {
  it('fits as many whole lines as the room holds', () => {
    assert.equal(openingLines({ room: 200, lineHeight: 27 }), 7);
  });

  it('always shows at least one line, even in a cramped room', () => {
    assert.equal(openingLines({ room: 10, lineHeight: 27 }), 1);
  });

  it('shows one line before the room has been measured', () => {
    assert.equal(openingLines({ room: 0, lineHeight: 0 }), 1);
  });
});

describe('the text block (#61)', () => {
  it('starts where the note does, a touch under the top inset', () => {
    assert.equal(textBlockTop(30), 30 + SPACE.touch);
  });

  it('ends above the pills and the bottom inset', () => {
    assert.equal(textBlockBottom({ height: 800, bottomInset: 40 }), 800 - 40 - SPACE.touch - TEXT_PILLS_GAP);
  });

  it('is the measure from the block’s top to its bottom, where the hero lands', () => {
    const frame = { width: 360, height: 800, wordsTop: 0, textTop: 78, textBottom: 688 };
    assert.deepEqual(textPlace(frame), { x: SPACE.margin, y: 78, width: 360 - SPACE.margin * 2, height: 610 });
  });
});
