/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contrastRatio } from './contrast.ts';
import { PALETTES, SCREENING_ROOM, SKETCH, type Scheme } from './tokens.ts';
import { textStyle, tokensOf, TYPE_SCALE } from './typeScale.ts';

const SCHEMES: readonly Scheme[] = ['light', 'dark'];
const AA_BODY = 4.5;
const AA_LARGE = 3;
/** The dark wall and the screen must differ enough that entering the feed reads as a change of room. */
const ROOM_STEP = 1.12;
/** The how-to's sample picture must read as a picture on the print's paper, not as a smudge (#75). */
const PICTURE_STEP = 1.3;
const HILLS_STEP = 1.2;

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

  it('keeps the label on an accent pill at AA body contrast, in both themes (Save, Take down)', () => {
    const failures = SCHEMES.filter((scheme) => contrastRatio(PALETTES[scheme].onAccent, PALETTES[scheme].accent) < AA_BODY);
    assert.deepEqual(failures, []);
  });

  it('keeps every ink at AA body contrast on the feature wall, in both themes', () => {
    const failures = SCHEMES.flatMap((scheme) => {
      const p = PALETTES[scheme];
      return (['ink', 'ink2', 'ink3'] as const).filter((ink) => contrastRatio(p[ink], p.wallDeep) < AA_BODY).map((ink) => `${scheme} ${ink}`);
    });
    assert.deepEqual(failures, []);
  });

  it('makes the screening room a different room from the dark wall', () => {
    assert.equal(contrastRatio(PALETTES.dark.wall, PALETTES.dark.screen) >= ROOM_STEP, true);
  });

  it('outlines the screening room in its own rule', () => {
    assert.equal(SCREENING_ROOM.rule, PALETTES.dark.screenRule);
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
    assert.deepEqual([tokensOf('note'), tokensOf('action')], [['note', 'prompt', 'label'], ['action', 'actionS', 'card']]);
  });

  it('sets the how-to picture apart from the print paper, and its hills from the picture, in both themes', () => {
    const failures = SCHEMES.flatMap((scheme) => {
      const { picture, pictureShade } = SKETCH[scheme];
      const checks = [
        { name: 'picture on paper', ratio: contrastRatio(picture, PALETTES[scheme].raised), least: PICTURE_STEP },
        { name: 'hills on picture', ratio: contrastRatio(pictureShade, picture), least: HILLS_STEP },
      ];
      return checks.filter(({ ratio, least }) => ratio < least).map(({ name }) => `${scheme} ${name}`);
    });
    assert.deepEqual(failures, []);
  });
});
