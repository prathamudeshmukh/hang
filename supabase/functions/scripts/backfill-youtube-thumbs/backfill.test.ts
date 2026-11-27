import { expect } from '@std/expect';
import { beforeEach, describe, it } from '@std/testing/bdd';
import { type LetterboxedItem, type NewPicture, runBackfill } from './backfill.ts';

const ID = 'abc123XYZ_0';
const letterboxed = (id: string, videoId = ID): LetterboxedItem => ({ id, imageUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` });
const MAXRES = `https://i.ytimg.com/vi/${ID}/maxresdefault.jpg`;

describe('runBackfill (YouTube thumbnails, #107)', () => {
  let saved: NewPicture[];
  let lines: string[];
  beforeEach(() => {
    saved = [];
    lines = [];
  });

  const run = (found: readonly LetterboxedItem[], apply: boolean, existing: readonly string[] = [MAXRES]) =>
    runBackfill({
      store: {
        listLetterboxed: () => Promise.resolve(found),
        savePicture: (picture) => (saved.push(picture), Promise.resolve()),
      },
      imageExists: (url) => Promise.resolve(existing.includes(url)),
      apply,
      print: (line) => lines.push(line),
    });

  it('points each letterboxed item at its 16:9 picture when applied', async () => {
    await run([letterboxed('a')], true);
    expect(saved).toEqual([{ itemId: 'a', from: letterboxed('a').imageUrl, imageUrl: MAXRES }]);
  });

  it('uses the medium picture when the large one is missing', async () => {
    await run([letterboxed('a')], true, []);
    expect(saved[0]?.imageUrl).toBe(`https://i.ytimg.com/vi/${ID}/mqdefault.jpg`);
  });

  it('writes nothing on a dry run but says how many it would change', async () => {
    await run([letterboxed('a'), letterboxed('b')], false);
    expect(saved).toEqual([]);
    expect(lines.at(-1)).toBe('2 letterboxed YouTube pictures: 2 to change (dry run: nothing changed)');
  });

  it('skips an address it cannot read a video id from, printing only the item id', async () => {
    await run([{ id: 'odd', imageUrl: 'https://i.ytimg.com/vi/not a video id/hqdefault.jpg' }, letterboxed('a')], true);
    expect(saved.map(({ itemId }) => itemId)).toEqual(['a']);
    expect(lines.some((line) => line.includes('ytimg'))).toBe(false);
  });
});
