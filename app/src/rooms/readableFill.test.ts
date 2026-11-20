/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrastRatio } from '../theme/contrast.ts';
import { MARK_COLOURS } from '../theme/hangMark.ts';
import { DARK_INK, LIGHT_INK, readableFill } from './readableFill.ts';

const AA = 4.5;
const { ochre, teal, rose, blue, sage } = MARK_COLOURS;
const HARD = ['#808080', '#7a7a2a', '#ffffff', '#000000', '#3f8f4a'];

describe('readableFill', () => {
  it('keeps both ends of the gradient at AA with its ink, for every icon colour and some hard ones', () => {
    const worst = [ochre, teal, rose, blue, sage, ...HARD].map((colour) => {
      const { top, end, ink } = readableFill(colour);
      return Math.min(contrastRatio(ink, top), contrastRatio(ink, end));
    });
    assert.ok(Math.min(...worst) >= AA, `worst ${Math.min(...worst).toFixed(2)}`);
  });

  it('writes in light ink on a deep colour and dark ink on a pale one', () => {
    assert.deepEqual([readableFill(blue).ink, readableFill('#f0e0a0').ink], [LIGHT_INK, DARK_INK]);
  });

  it('starts the gradient a touch lighter and ends it deeper than the colour', () => {
    const { top, end } = readableFill(teal);
    assert.ok(contrastRatio(top, '#000000') > contrastRatio(end, '#000000'));
  });
});
