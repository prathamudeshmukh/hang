import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { INK, paletteOf, WALL } from './palette.ts';

type Rgba = readonly [number, number, number, number];

/** A bitmap made of runs: [color, pixel count]. */
function bitmap(...runs: ReadonlyArray<readonly [Rgba, number]>): Uint8Array {
  return new Uint8Array(runs.flatMap(([color, count]) => Array.from({ length: count }, () => [...color]).flat()));
}

const RED: Rgba = [220, 30, 40, 255];
const BLUE: Rgba = [30, 60, 200, 255];
const SAGE: Rgba = [120, 140, 120, 255];
const WHITE: Rgba = [250, 250, 250, 255];
const BLACK: Rgba = [5, 5, 5, 255];
const CLEAR: Rgba = [255, 0, 0, 0];

describe('paletteOf', () => {
  it('takes the most common colour as dominant and a calm, mid-tone one as muted', () => {
    const palette = paletteOf(bitmap([BLUE, 70], [SAGE, 30]));
    expect(palette).toEqual({ dominant: '#1e3cc8', muted: '#788c78', onDominant: WALL });
  });

  it('falls back to a softened dominant when no colour is muted', () => {
    const palette = paletteOf(bitmap([RED, 100]));
    expect(palette?.dominant).toBe('#dc1e28');
    expect(palette?.muted).not.toBe(palette?.dominant);
  });

  it('picks the text colour that reads best on the dominant', () => {
    const onColors = [WHITE, BLACK].map((color) => paletteOf(bitmap([color, 10]))?.onDominant);
    expect(onColors).toEqual([INK, WALL]);
  });

  it('ignores transparent pixels, and returns null when nothing is visible', () => {
    expect(paletteOf(bitmap([CLEAR, 90], [SAGE, 10]))?.dominant).toBe('#788c78');
    expect(paletteOf(bitmap([CLEAR, 10]))).toBeNull();
    expect(paletteOf(new Uint8Array())).toBeNull();
  });
});
