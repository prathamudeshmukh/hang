/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { roomHue, type ColourVote } from './roomHue.ts';

const photo = (colour: string): ColourVote => ({ colour, kind: 'image' });
const preview = (colour: string): ColourVote => ({ colour, kind: 'link' });

/** Hue families are 30° wide: green (128°, 132°) is 4, blue (225°) is 7, red (6°) is 0. */
const GREEN = '#3f8f4a';
const MOSS = '#4a9a5a';
const BLUE = '#2e4a9d';
const RED = '#c0392b';
const GREYS = ['#f4f4f4', '#7a7a7a', '#121212', '#8a8f8c'];

describe('roomHue', () => {
  it('is none when no item has a palette yet', () => {
    assert.deepEqual(roomHue([], null), { kind: 'none' });
  });

  it('is grey when every colour is greyish', () => {
    assert.deepEqual(roomHue(GREYS.map(photo), null), { kind: 'grey' });
  });

  it('gives "Dev notes" (greys, brand banners, real photos) its green', () => {
    const votes = [preview(BLUE), ...GREYS.map(photo), photo(GREEN), preview(RED), photo(MOSS), photo(GREEN)];
    const hue = roomHue(votes, null);
    assert.equal(hue.kind === 'family' && hue.family, 4);
  });

  it('weighs newer items more, so the newest colour wins a tie', () => {
    const hue = roomHue([photo(BLUE), photo(GREEN)], null);
    assert.equal(hue.kind === 'family' && hue.family, 7);
  });

  it('keeps the previous family unless another beats it by a clear margin', () => {
    const close = [photo(BLUE), photo(GREEN), photo(BLUE), photo(GREEN)];
    const hue = roomHue(close, 4);
    assert.equal(hue.kind === 'family' && hue.family, 4);
  });

  it('moves on when the previous family is gone or clearly beaten', () => {
    const [gone, beaten] = [roomHue([photo(BLUE)], 4), roomHue([photo(BLUE), photo(BLUE), photo(BLUE), photo(GREEN)], 4)];
    assert.deepEqual([gone.kind === 'family' && gone.family, beaten.kind === 'family' && beaten.family], [7, 7]);
  });

  it('averages the winning family into the room\'s colour', () => {
    const hue = roomHue([photo(GREEN), photo(MOSS), photo(BLUE), photo(RED)], null);
    assert.ok(hue.kind === 'family');
    assert.equal(Math.floor(hue.base.h / 30), 4);
  });
});
