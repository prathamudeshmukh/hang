import { expect } from '@std/expect';
import { beforeEach, describe, it } from '@std/testing/bdd';
import type { PostJson } from '../../extract/types.ts';
import { type PostPicture, type PostWithoutThumbnail, runBackfill } from './backfill.ts';

const POST_JSON: PostJson = { author: 'Alex', handle: 'alex', avatar: null, text: 'Here’s mine:', media: ['https://pbs.test/p.jpg?name=large'], posted_at: null };
const postItem = (id: string, imageUrl: string | null = null): PostWithoutThumbnail => ({ id, userId: 'u1', sourceUrl: `https://x.test/alex/status/${id}`, sharedTitle: null, imageUrl });
const pictureOf = (item: PostWithoutThumbnail): PostPicture => ({ itemId: item.id, post: POST_JSON, imageUrl: 'https://pbs.test/p.jpg?name=large' });

describe('runBackfill (post pictures, #110)', () => {
  let saved: PostPicture[];
  let lines: string[];
  beforeEach(() => {
    saved = [];
    lines = [];
  });

  const run = (posts: readonly PostWithoutThumbnail[], apply: boolean) =>
    runBackfill({
      store: {
        listPostsWithoutThumbnail: () => Promise.resolve(posts),
        savePicture: (picture) => {
          saved.push(picture);
          return Promise.resolve();
        },
      },
      readPicture: (item) => (item.id === 'gone' ? Promise.reject(new Error('HTTP 404 https://x.test/gone')) : Promise.resolve(item.id === 'bare' ? null : pictureOf(item))),
      apply,
      print: (line) => lines.push(line),
    });

  it('saves the picture it finds when applied', async () => {
    await run([postItem('a'), postItem('b')], true);
    expect(saved.map(({ itemId }) => itemId)).toEqual(['a', 'b']);
  });

  it('writes nothing on a dry run but says what it would save', async () => {
    await run([postItem('a'), postItem('bare')], false);
    expect(saved).toEqual([]);
    expect(lines.at(-1)).toBe('2 posts without a thumbnail: 1 picture found, 1 without (dry run: nothing changed)');
  });

  it('leaves a post whose picture address is unchanged: writing it again would not wake the media step', async () => {
    await run([postItem('same', 'https://pbs.test/p.jpg?name=large')], true);
    expect(saved).toEqual([]);
  });

  it('skips a post whose page fails, printing its id and never its address', async () => {
    await run([postItem('gone'), postItem('a')], true);
    expect(saved.map(({ itemId }) => itemId)).toEqual(['a']);
    expect(lines.join('\n')).not.toContain('x.test');
  });
});
