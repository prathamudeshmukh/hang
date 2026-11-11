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
