import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { xPost } from '../../adapters/xPost.ts';
import { makeContext } from '../helpers.ts';

const POST_URL = 'https://x.com/someone/status/1790000000000000000?s=20';
const MIRROR = 'https://api.fxtwitter.com/';
const MIRROR_BODY = {
  code: 200,
  tweet: {
    text: 'Good design is mostly saying no to good ideas.',
    created_at: 'Wed May 15 10:00:00 +0000 2024',
    author: { name: 'Some One', screen_name: 'someone', avatar_url: 'https://pbs.test/a.jpg' },
    media: { photos: [{ url: 'https://pbs.test/p1.jpg', width: 1200, height: 800 }] },
  },
};

describe('xPost adapter', () => {
  it('matches status urls on x.com and twitter.com only', () => {
    expect(xPost.matches(new URL(POST_URL))).toBe(true);
    expect(xPost.matches(new URL('https://twitter.com/a/status/1'))).toBe(true);
    expect(xPost.matches(new URL('https://x.com/someone'))).toBe(false);
  });

  it('snapshots the post from the mirror', async () => {
    const result = await xPost.extract(makeContext(POST_URL, { json: { [MIRROR]: MIRROR_BODY } }));
    expect(result).toMatchObject({ kind: 'post', author: 'Some One', imageUrl: 'https://pbs.test/p1.jpg' });
    expect(result?.post).toMatchObject({ handle: 'someone', text: MIRROR_BODY.tweet.text, mediaUrls: ['https://pbs.test/p1.jpg'] });
  });

  describe('pictures on X’s image host', () => {
    const withPhoto = (url: string) => ({ ...MIRROR_BODY, tweet: { ...MIRROR_BODY.tweet, media: { photos: [{ url }] } } });
    const extractWithPhoto = (url: string) => xPost.extract(makeContext(POST_URL, { json: { [MIRROR]: withPhoto(url) } }));

    it('asks for the large size, not the original, so the thumbnail step can take it (#69)', async () => {
      const result = await extractWithPhoto('https://pbs.twimg.com/media/HXLACIpWAAEhYGU.jpg?name=orig');
      expect(result?.imageUrl).toBe('https://pbs.twimg.com/media/HXLACIpWAAEhYGU.jpg?name=large');
      expect(result?.post?.mediaUrls).toEqual(['https://pbs.twimg.com/media/HXLACIpWAAEhYGU.jpg?name=large']);
    });

    it('adds the large size to an address that names none, keeping its format', async () => {
      const result = await extractWithPhoto('https://pbs.twimg.com/media/abc?format=png');
      expect(result?.imageUrl).toBe('https://pbs.twimg.com/media/abc?format=png&name=large');
    });

    it('leaves a picture on another host as it is', async () => {
      const result = await extractWithPhoto('https://images.example/p.jpg?name=orig');
      expect(result?.imageUrl).toBe('https://images.example/p.jpg?name=orig');
    });
  });

  describe('videos and GIFs answer with their frame (#110)', () => {
    const withMedia = (media: Record<string, unknown>) => ({ ...MIRROR_BODY, tweet: { ...MIRROR_BODY.tweet, media } });
    const extractWith = (media: Record<string, unknown>) => xPost.extract(makeContext(POST_URL, { json: { [MIRROR]: withMedia(media) } }));

    it('takes a video’s frame as the picture when the post has no photo', async () => {
      const result = await extractWith({ videos: [{ type: 'video', url: 'https://video.test/v.mp4', thumbnail_url: 'https://pbs.test/v-frame.jpg' }] });
      expect(result?.imageUrl).toBe('https://pbs.test/v-frame.jpg');
    });

    it('keeps photos ahead of video and GIF frames', async () => {
      const result = await extractWith({ photos: [{ url: 'https://pbs.test/p1.jpg' }], videos: [{ type: 'gif', thumbnail_url: 'https://pbs.test/g-frame.jpg' }] });
      expect(result?.post?.mediaUrls).toEqual(['https://pbs.test/p1.jpg', 'https://pbs.test/g-frame.jpg']);
    });

    it('skips a video that comes without a frame', async () => {
      const result = await extractWith({ videos: [{ type: 'video', url: 'https://video.test/v.mp4' }] });
      expect(result?.imageUrl).toBeUndefined();
    });
  });

  it('uses the first line of text as the title, truncated', async () => {
    const long = { ...MIRROR_BODY, tweet: { ...MIRROR_BODY.tweet, text: 'x'.repeat(200), media: undefined } };
    const result = await xPost.extract(makeContext(POST_URL, { json: { [MIRROR]: long } }));
    expect(result?.title?.length).toBeLessThanOrEqual(90);
    expect(result?.imageUrl).toBeUndefined();
  });

  it('falls back to publish.twitter.com oEmbed when the mirror fails', async () => {
    const ctx = makeContext(POST_URL, {
      json: {
        [MIRROR]: new Error('mirror down'),
        'https://publish.twitter.com/oembed': {
          author_name: 'Some One',
          html: '<blockquote class="twitter-tweet"><p lang="en">Good design is mostly saying no.</p>&mdash; Some One (@someone)</blockquote>',
        },
      },
    });
    const result = await xPost.extract(ctx);
    expect(result?.kind).toBe('post');
    expect(result?.post?.text).toBe('Good design is mostly saying no.');
  });

  it('throws when both sources fail so the registry can fall back to generic', async () => {
    const ctx = makeContext(POST_URL, {
      json: { [MIRROR]: new Error('down'), 'https://publish.twitter.com/oembed': new Error('down') },
    });
    await expect(xPost.extract(ctx)).rejects.toThrow();
  });
});
