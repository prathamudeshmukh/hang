import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { Frame, GIF, Image } from 'imagescript';
import { readImageHeader } from './imageHeader.ts';

const WIDTH = 37;
const HEIGHT = 21;
const sample = () => new Image(WIDTH, HEIGHT).fill(0x336699ff);

describe('readImageHeader', () => {
  it('reads format and size from real JPEG, PNG, WebP and GIF files', async () => {
    const files = {
      jpeg: await sample().encodeJPEG(80),
      png: await sample().encode(),
      webp: await sample().encodeWebP({ quality: 80 }),
      gif: await new GIF([Frame.from(sample())]).encode(),
    };
    const headers = Object.entries(files).map(([format, bytes]) => [format, readImageHeader(bytes)]);
    expect(Object.fromEntries(headers)).toEqual({
      jpeg: { format: 'jpeg', width: WIDTH, height: HEIGHT },
      png: { format: 'png', width: WIDTH, height: HEIGHT },
      webp: { format: 'webp', width: WIDTH, height: HEIGHT },
      gif: { format: 'gif', width: WIDTH, height: HEIGHT },
    });
  });

  it('reads lossless (VP8L) and extended (VP8X) WebP headers', () => {
    const riff = (chunk: string, payload: number[]) =>
      new Uint8Array([...'RIFF'].map((c) => c.charCodeAt(0)).concat([0, 0, 0, 0], [...`WEBP${chunk}`].map((c) => c.charCodeAt(0)), [0, 0, 0, 0], payload));
    // VP8L: 0x2f, then 14-bit width-1 and height-1 packed little-endian: 100x50 → 99, 49.
    const lossless = riff('VP8L', [0x2f, 99, (49 & 0x3) << 6, (49 >> 2) & 0xff, (49 >> 10) & 0xf]);
    // VP8X: flags + 3 reserved bytes, then 24-bit width-1 and height-1: 3000x2000.
    const extended = riff('VP8X', [0, 0, 0, 0, 0xb7, 0x0b, 0x00, 0xcf, 0x07, 0x00]);
    expect([readImageHeader(lossless), readImageHeader(extended)]).toEqual([
      { format: 'webp', width: 100, height: 50 },
      { format: 'webp', width: 3000, height: 2000 },
    ]);
  });

  it('rejects SVG, HTML, truncated and unknown bytes', () => {
    const text = (s: string) => new TextEncoder().encode(s);
    const inputs = [
      text('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>'),
      text('<!doctype html><title>not an image</title>'),
      new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00]),
      new Uint8Array(),
    ];
    expect(inputs.map(readImageHeader)).toEqual(inputs.map(() => null));
  });

  it('rejects an image that claims a zero size', () => {
    const png = new Uint8Array(24);
    png.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
    expect(readImageHeader(png)).toBeNull();
  });

  it('walks JPEG fill bytes, standalone markers and segments to the frame header', () => {
    // SOI, fill byte, RST0 (no length), APP0 with a 4-byte segment, then SOF0: 8-bit, 300 high, 400 wide.
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xff, 0xd0, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x01, 0x2c, 0x01, 0x90, 0x03]);
    expect(readImageHeader(jpeg)).toEqual({ format: 'jpeg', width: 400, height: 300 });
  });

  it('rejects broken JPEG markers, unknown WebP chunks and short GIFs', () => {
    const notAMarker = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x02, 0x12, 0x34, 0x56, 0x78, 0x9a, 0xbc]);
    const alphaChunk = new TextEncoder().encode('RIFF\0\0\0\0WEBPALPH\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0\0');
    const shortGif = new TextEncoder().encode('GIF89a\x01');
    expect([notAMarker, alphaChunk, shortGif].map(readImageHeader)).toEqual([null, null, null]);
  });
});
