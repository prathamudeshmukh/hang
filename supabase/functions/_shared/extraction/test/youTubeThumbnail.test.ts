import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { youTubeThumbnail } from '../youTubeThumbnail.ts';

const MAXRES = 'https://i.ytimg.com/vi/abc123XYZ_0/maxresdefault.jpg';
const MEDIUM = 'https://i.ytimg.com/vi/abc123XYZ_0/mqdefault.jpg';

describe('youTubeThumbnail', () => {
  it('takes the large 16:9 picture when YouTube has one', async () => {
    const asked: string[] = [];
    const exists = (url: string) => (asked.push(url), Promise.resolve(true));
    expect(await youTubeThumbnail('abc123XYZ_0', exists)).toEqual({ url: MAXRES, width: 1280, height: 720 });
    expect(asked).toEqual([MAXRES]);
  });

  it('falls back to the medium 16:9 picture when the large one is missing', async () => {
    const thumbnail = await youTubeThumbnail('abc123XYZ_0', () => Promise.resolve(false));
    expect(thumbnail).toEqual({ url: MEDIUM, width: 320, height: 180 });
  });

  it('falls back when the check itself fails', async () => {
    const thumbnail = await youTubeThumbnail('abc123XYZ_0', () => Promise.reject(new Error('timed out')));
    expect(thumbnail.url).toBe(MEDIUM);
  });
});
