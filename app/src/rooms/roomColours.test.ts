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
const ICON_HUES = ['ochre', 'teal', 'rose', 'blue'].map((name) => Math.round(hexToHsl(MARK_COLOURS[name as 'ochre']).h));
const SAGE_HUE = Math.round(hexToHsl(MARK_COLOURS.sage).h);
const IDS = Array.from({ length: 40 }, (_, at) => `c${at}`);
const hueOf = (hex: string) => Math.round(hexToHsl(hex).h);
const lightnessOf = (hex: string) => hexToHsl(hex).l;

describe('roomColours', () => {
  it('makes a neon colour rich: lightness at most 0.50 in light, deeper still in dark', () => {
    const { light, dark } = roomColours(NEON, 'c1');
    assert.ok(lightnessOf(light.colour) <= 0.5 + 0.01);
    assert.ok(lightnessOf(dark.colour) <= 0.38 + 0.01);
  });

  it('prints in three shades of the room\'s own hue, so a print says which room it hangs in', () => {
    const { light, dark } = roomColours(NEON, 'c1');
    const prints = [...light.prints, ...dark.prints];
    assert.equal(new Set(light.prints.map((print) => print.colour)).size, 3);
    assert.ok(prints.every((print) => Math.abs(hueOf(print.colour) - 128) <= 2));
  });

  it('darkens reds to oxblood, well clear of vermilion, with three distinct shades', () => {
    const { light, dark } = roomColours(RED, 'c1');
    const all = [light.colour, dark.colour, ...light.prints.map((print) => print.colour), ...dark.prints.map((print) => print.colour)];
    assert.ok(all.every((colour) => contrastRatio(colour, VERMILION) >= 1.5), all.join(' '));
    assert.equal(new Set(light.prints.map((print) => print.colour)).size, 3);
  });

  it('gives a room without pictures one of the icon colours, the same one every time, never vermilion', () => {
    const [first, again] = [roomColours({ kind: 'none' }, 'c1'), roomColours({ kind: 'none' }, 'c1')];
    assert.equal(first.light.colour, again.light.colour);
    assert.ok(ICON_HUES.some((hue) => Math.abs(hue - hueOf(first.light.colour)) <= 3));
  });

  it('never gives a room without pictures sage, which would pass for a grey room', () => {
    const hues = IDS.map((id) => hueOf(roomColours({ kind: 'none' }, id).light.colour));
    assert.ok(hues.every((hue) => Math.abs(hue - SAGE_HUE) > 5), hues.join(' '));
  });

  it('gives an all-grey room a grey, and remembers no family for it', () => {
    const grey = roomColours({ kind: 'grey' }, 'c1');
    assert.ok(hexToHsl(grey.light.colour).s < 0.15);
    assert.equal(grey.family, null);
  });
});
