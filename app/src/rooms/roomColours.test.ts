/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MARK_COLOURS } from '../theme/hangMark.ts';
import { contrastRatio } from '../theme/contrast.ts';
import { hexToHsl } from './colour.ts';
import { roomColours } from './roomColours.ts';
import type { RoomHue } from './roomHue.ts';

const NEON: RoomHue = { kind: 'family', family: 4, base: { h: 128, s: 1, l: 0.75 } };
const RED: RoomHue = { kind: 'family', family: 0, base: { h: 2, s: 0.75, l: 0.5 } };
const VERMILION = MARK_COLOURS.vermilion;
const hueOf = (hex: string) => Math.round(hexToHsl(hex).h);
const lightnessOf = (hex: string) => hexToHsl(hex).l;

describe('roomColours', () => {
  it('makes a neon colour rich: lightness at most 0.50 in light, deeper still in dark', () => {
    const { light, dark } = roomColours(NEON)!;
    assert.ok(lightnessOf(light.colour) <= 0.5 + 0.01);
    assert.ok(lightnessOf(dark.colour) <= 0.38 + 0.01);
  });

  it('prints in three shades of the room\'s own hue, so a print says which room it hangs in', () => {
    const { light, dark } = roomColours(NEON)!;
    const prints = [...light.prints, ...dark.prints];
    assert.equal(new Set(light.prints.map((print) => print.colour)).size, 3);
    assert.ok(prints.every((print) => Math.abs(hueOf(print.colour) - 128) <= 2));
  });

  it('darkens reds to oxblood, well clear of vermilion, with three distinct shades', () => {
    const { light, dark } = roomColours(RED)!;
    const all = [light.colour, dark.colour, ...light.prints.map((print) => print.colour), ...dark.prints.map((print) => print.colour)];
    assert.ok(all.every((colour) => contrastRatio(colour, VERMILION) >= 1.5), all.join(' '));
    assert.equal(new Set(light.prints.map((print) => print.colour)).size, 3);
  });

  it('gives a room without pictures no colour: a colour only says what hangs there (#96)', () => {
    assert.equal(roomColours({ kind: 'none' }), null);
  });

  it('gives an all-grey room a grey, and remembers no family for it', () => {
    const grey = roomColours({ kind: 'grey' })!;
    assert.ok(hexToHsl(grey.light.colour).s < 0.15);
    assert.equal(grey.family, null);
  });
});
