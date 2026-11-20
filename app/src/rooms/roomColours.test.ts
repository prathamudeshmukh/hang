/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MARK_COLOURS } from '../theme/hangMark.ts';
import { hexToHsl } from './colour.ts';
import { roomColours } from './roomColours.ts';
import type { RoomHue } from './roomHue.ts';

const NEON: RoomHue = { kind: 'family', family: 4, base: { h: 128, s: 1, l: 0.75 }, others: [] };
const THREE: RoomHue = { kind: 'family', family: 4, base: { h: 128, s: 0.6, l: 0.4 }, others: [{ h: 225, s: 0.5, l: 0.4 }, { h: 5, s: 0.6, l: 0.45 }] };
const ICON_HUES = ['ochre', 'teal', 'rose', 'blue', 'sage'].map((name) => Math.round(hexToHsl(MARK_COLOURS[name as 'ochre']).h));
const hueOf = (hex: string) => Math.round(hexToHsl(hex).h);
const lightnessOf = (hex: string) => hexToHsl(hex).l;

describe('roomColours', () => {
  it('makes a neon colour rich: lightness at most 0.50 in light, deeper still in dark', () => {
    const { light, dark } = roomColours(NEON, 'c1');
    assert.ok(lightnessOf(light.colour) <= 0.5 + 0.01);
    assert.ok(lightnessOf(dark.colour) <= 0.38 + 0.01);
  });

  it('prints on the room colour and its two runners-up, in that order', () => {
    const { light } = roomColours(THREE, 'c1');
    assert.deepEqual(light.prints.map((print) => Math.round(hueOf(print.colour) / 30)), [4, 8, 0]);
  });

  it('fills missing runners-up with lighter and darker shades of the room colour', () => {
    const { light } = roomColours(NEON, 'c1');
    const lightness = light.prints.map((print) => lightnessOf(print.colour));
    assert.equal(new Set(light.prints.map((print) => print.colour)).size, 3);
    assert.ok(light.prints.every((print) => Math.abs(hueOf(print.colour) - 128) <= 2), `hues ${lightness}`);
  });

  it('gives a room without pictures one of the icon colours, the same one every time, never vermilion', () => {
    const [first, again] = [roomColours({ kind: 'none' }, 'c1'), roomColours({ kind: 'none' }, 'c1')];
    assert.equal(first.light.colour, again.light.colour);
    assert.ok(ICON_HUES.some((hue) => Math.abs(hue - hueOf(first.light.colour)) <= 3));
  });

  it('gives an all-grey room a grey, and remembers no family for it', () => {
    const grey = roomColours({ kind: 'grey' }, 'c1');
    assert.ok(hexToHsl(grey.light.colour).s < 0.15);
    assert.equal(grey.family, null);
  });
});
