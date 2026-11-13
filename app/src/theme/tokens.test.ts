/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrastRatio } from './contrast.ts';
import { PALETTES, SCREENING_ROOM, type Scheme } from './tokens.ts';
import { textStyle, tokensOf, TYPE_SCALE } from './typeScale.ts';

const SCHEMES: readonly Scheme[] = ['light', 'dark'];
const AA_BODY = 4.5;
const AA_LARGE = 3;

describe('palette (DESIGN.md §10)', () => {
  it('keeps every ink at AA body contrast on the wall and on raised surfaces, in both themes', () => {
    const failures = SCHEMES.flatMap((scheme) => {
      const p = PALETTES[scheme];
      return (['ink', 'ink2', 'ink3'] as const).flatMap((ink) =>
        [p.wall, p.raised].filter((ground) => contrastRatio(p[ink], ground) < AA_BODY).map((ground) => `${scheme} ${ink} on ${ground}`));
    });
    assert.deepEqual(failures, []);
  });

  it('keeps the accent and screen ink readable', () => {
    const ratios = SCHEMES.flatMap((scheme) => [contrastRatio(PALETTES[scheme].accent, PALETTES[scheme].wall), contrastRatio(PALETTES[scheme].screenInk, PALETTES[scheme].screen)]);
    assert.equal(ratios.every((ratio) => ratio >= AA_LARGE), true);
  });

  it('keeps every ink at AA body contrast in the screening room, on its wall and raised sheets', () => {
    const p = SCREENING_ROOM;
    const failures = (['ink', 'ink2', 'ink3'] as const).flatMap((ink) =>
      [p.wall, p.raised].filter((ground) => contrastRatio(p[ink], ground) < AA_BODY).map((ground) => `${ink} on ${ground}`));
    assert.deepEqual(failures, []);
  });

  it('builds the screening room from the screen colors, so the feed is always dark', () => {
    assert.deepEqual([SCREENING_ROOM.wall, SCREENING_ROOM.ink], [PALETTES.light.screen, PALETTES.light.screenInk]);
  });

  it('never uses pure black for the dark wall', () => {
    assert.notEqual(PALETTES.dark.wall.toUpperCase(), '#000000');
  });
});

describe('type scale (DESIGN.md §4)', () => {
  it('turns a token into font, size, rounded line height and tracking', () => {
    assert.deepEqual(textStyle('display'), { fontFamily: 'Newsreader-Display-Book', fontSize: 40, lineHeight: 40, letterSpacing: -1.2 });
    assert.deepEqual(textStyle('note'), { fontFamily: 'Newsreader-Text-Italic', fontSize: 13, lineHeight: 18, letterSpacing: 0 });
  });

  it('keeps every functional size at 12 or more', () => {
    assert.equal(Object.values(TYPE_SCALE).every(({ size }) => size >= 12), true);
  });

  it('groups tokens by voice', () => {
    assert.deepEqual([tokensOf('note'), tokensOf('action')], [['note', 'prompt'], ['action', 'actionS', 'card']]);
  });
});
