/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { averageColour, hexToHsl, hslToHex, mix } from './colour.ts';

describe('colour', () => {
  it('reads hue, saturation and lightness, and writes them back unchanged', () => {
    const hsl = hexToHsl('#2e4a9d');
    assert.deepEqual([Math.round(hsl.h), Math.round(hsl.s * 100), Math.round(hsl.l * 100)], [225, 55, 40]);
    assert.equal(hslToHex(hsl), '#2e4a9d');
  });

  it('reads a grey as unsaturated', () => {
    assert.deepEqual(hexToHsl('#808080').s, 0);
  });

  it('mixes two colours and averages several by weight', () => {
    assert.equal(mix('#ffffff', '#000000', 0.5), '#808080');
    assert.equal(averageColour([{ colour: '#ff0000', weight: 3 }, { colour: '#0000ff', weight: 1 }]), '#bf0040');
  });
});
