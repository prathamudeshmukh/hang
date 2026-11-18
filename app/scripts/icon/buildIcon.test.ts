import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { iconLayers, renderPng } from './buildIcon.ts';
import { HANG_ICON } from './iconArt.ts';

const PNG_SIGNATURE = '89504e470d0a1a0a';
// The IHDR chunk holds the width and height as big-endian 32-bit ints at bytes 16 and 20.
const sizeOf = (png: Buffer) => ({ width: png.readUInt32BE(16), height: png.readUInt32BE(20) });

describe('iconLayers', () => {
  it('names the four images app.json points at', () => {
    const files = Object.keys(iconLayers(HANG_ICON));

    assert.deepEqual(files, ['icon.png', 'android-icon-foreground.png', 'android-icon-monochrome.png', 'splash-icon.png']);
  });

  it('leaves the adaptive foreground transparent for the background colour to show through', () => {
    const layers = iconLayers(HANG_ICON);

    assert.doesNotMatch(layers['android-icon-foreground.png'], /width="1024" height="1024" fill=/);
    assert.match(layers['icon.png'], /width="1024" height="1024" fill=/);
  });
});

describe('renderPng', () => {
  it('renders an SVG to a 1024px square PNG', () => {
    const png = renderPng(iconLayers(HANG_ICON)['icon.png']);

    assert.equal(png.subarray(0, 8).toString('hex'), PNG_SIGNATURE);
    assert.deepEqual(sizeOf(png), { width: 1024, height: 1024 });
  });

  it('refuses something that is not an SVG', () => {
    assert.throws(() => renderPng('not an svg'));
  });
});
