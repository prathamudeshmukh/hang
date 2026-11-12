import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { Frame, GIF, Image } from 'imagescript';
import { readImageHeader } from './imageHeader.ts';
import { makeThumbnail, MAX_PIXELS, THUMB_WIDTH } from './thumbnail.ts';

const jpeg = (width: number, height: number) => new Image(width, height).fill(0x6688aaff).encodeJPEG(80);

describe('makeThumbnail', () => {
  it('scales a wide image down to the thumbnail width, keeping its proportions, as WebP', async () => {
    const thumb = await makeThumbnail(await jpeg(2160, 1440));
    expect([thumb.width, thumb.height]).toEqual([THUMB_WIDTH, 720]);
    expect(readImageHeader(thumb.webp)).toEqual({ format: 'webp', width: THUMB_WIDTH, height: 720 });
    expect(thumb.rgba.length).toBe(THUMB_WIDTH * 720 * 4);
  });

  it('never scales a small image up', async () => {
    const thumb = await makeThumbnail(await jpeg(400, 300));
    expect([thumb.width, thumb.height]).toEqual([400, 300]);
  });

  it('uses the first frame of an animated GIF', async () => {
    const frames = [0xff0000ff, 0x00ff00ff].map((color) => Frame.from(new Image(60, 40).fill(color)));
    const thumb = await makeThumbnail(await new GIF(frames).encode());
    expect([thumb.width, thumb.height, thumb.rgba[0], thumb.rgba[1]]).toEqual([60, 40, 255, 0]);
  });

  it('refuses to decode more pixels than the cap, even when nothing checked the header first', async () => {
    const tooBig = await new Image(3000, Math.floor(MAX_PIXELS / 3000) + 1).encode();
    await expect(makeThumbnail(tooBig)).rejects.toThrow();
  });

  it('rejects bytes that are not a decodable image', async () => {
    const broken = (await jpeg(100, 100)).slice(0, 40);
    await expect(makeThumbnail(broken)).rejects.toThrow();
  });
});
