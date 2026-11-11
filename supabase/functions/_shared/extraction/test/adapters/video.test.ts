import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { youtube } from '../../adapters/youtube.ts';
import { vimeo } from '../../adapters/vimeo.ts';
import { directVideo } from '../../adapters/directVideo.ts';
import { externalVideo } from '../../adapters/externalVideo.ts';
import { fixture, htmlPage, makeContext } from '../helpers.ts';

const YT_URL = 'https://youtu.be/abc123XYZ_0';
const YT_OEMBED = {
  title: 'How Pentagram designs a logo',
  author_name: 'Design Channel',
  thumbnail_url: 'https://i.ytimg.com/vi/abc123XYZ_0/hqdefault.jpg',
  thumbnail_width: 480,
  thumbnail_height: 360,
};

describe('youtube adapter', () => {
  it('matches video urls only', () => {
    expect(youtube.matches(new URL(YT_URL))).toBe(true);
    expect(youtube.matches(new URL('https://www.youtube.com/@someone'))).toBe(false);
    expect(youtube.matches(new URL('https://vimeo.com/1'))).toBe(false);
  });

  it('builds an inline-playable video card with duration from the watch page', async () => {
    const ctx = makeContext(YT_URL, {
      json: { 'https://www.youtube.com/oembed': YT_OEMBED },
      page: htmlPage(fixture('youtube-watch.html')),
    });
    const result = await youtube.extract(ctx);
    expect(result).toMatchObject({ kind: 'video', title: YT_OEMBED.title, author: 'Design Channel' });
    expect(result?.durationSeconds).toBe(842);
    expect(result?.embed).toEqual({ provider: 'youtube', videoId: 'abc123XYZ_0', playableInline: true });
  });

  it('still returns a card without duration when the watch page fails', async () => {
    const ctx = makeContext(YT_URL, {
      json: { 'https://www.youtube.com/oembed': YT_OEMBED },
      page: new Error('blocked'),
    });
    const result = await youtube.extract(ctx);
    expect(result?.kind).toBe('video');
    expect(result?.durationSeconds).toBeUndefined();
  });

  it('drops non-http thumbnail urls from oEmbed', async () => {
    const ctx = makeContext(YT_URL, {
      json: { 'https://www.youtube.com/oembed': { ...YT_OEMBED, thumbnail_url: 'javascript:alert(1)' } },
      page: new Error('skip'),
    });
    expect((await youtube.extract(ctx))?.imageUrl).toBeUndefined();
  });

  it('throws when oEmbed returns an invalid shape', async () => {
    const ctx = makeContext(YT_URL, { json: { 'https://www.youtube.com/oembed': { nope: true } } });
    await expect(youtube.extract(ctx)).rejects.toThrow();
  });
});

describe('vimeo adapter', () => {
  it('maps oEmbed to an inline video card', async () => {
    const ctx = makeContext('https://vimeo.com/76979871', {
      json: {
        'https://vimeo.com/api/oembed.json': {
          title: 'The New Vimeo Player', author_name: 'Vimeo Staff', duration: 62,
          thumbnail_url: 'https://i.vimeocdn.com/video/1.jpg', thumbnail_width: 640, thumbnail_height: 360, video_id: 76979871,
        },
      },
    });
    const result = await vimeo.extract(ctx);
    expect(result).toMatchObject({ kind: 'video', title: 'The New Vimeo Player', durationSeconds: 62 });
    expect(result?.embed).toEqual({ provider: 'vimeo', videoId: '76979871', playableInline: true });
  });

  it('does not match vimeo non-video pages', () => {
    expect(vimeo.matches(new URL('https://vimeo.com/features'))).toBe(false);
  });
});

describe('directVideo adapter', () => {
  it('matches common video file extensions', () => {
    expect(directVideo.matches(new URL('https://cdn.test/clip.MP4'))).toBe(true);
    expect(directVideo.matches(new URL('https://cdn.test/live/stream.m3u8?x=1'))).toBe(true);
    expect(directVideo.matches(new URL('https://cdn.test/page.html'))).toBe(false);
  });

  it('titles the card from the file name', async () => {
    const result = await directVideo.extract(makeContext('https://cdn.test/videos/my-trip.mp4'));
    expect(result).toMatchObject({ kind: 'video', title: 'my-trip.mp4', embed: { provider: 'file', playableInline: true } });
  });
});

describe('externalVideo adapter', () => {
  it('matches tiktok and instagram reels', () => {
    expect(externalVideo.matches(new URL('https://www.tiktok.com/@scout2015/video/6718335390845095173'))).toBe(true);
    expect(externalVideo.matches(new URL('https://www.instagram.com/reel/Cabc123/'))).toBe(true);
    expect(externalVideo.matches(new URL('https://www.instagram.com/someone/'))).toBe(false);
  });

  it('uses tiktok oEmbed and marks the video as opening the platform app', async () => {
    const ctx = makeContext('https://www.tiktok.com/@scout2015/video/6718335390845095173', {
      json: { 'https://www.tiktok.com/oembed': { title: 'Scramble up ur name', author_name: 'Scout', thumbnail_url: 'https://p16.test/t.jpg' } },
    });
    const result = await externalVideo.extract(ctx);
    expect(result).toMatchObject({ kind: 'video', title: 'Scramble up ur name', imageUrl: 'https://p16.test/t.jpg' });
    expect(result?.embed).toEqual({ provider: 'tiktok', playableInline: false });
  });

  it('falls back to open graph when tiktok oEmbed is blocked, and stays a video', async () => {
    const ctx = makeContext('https://www.tiktok.com/@scout2015/video/6718335390845095173', {
      json: { 'https://www.tiktok.com/oembed': new Error('Unexpected token <') },
      page: htmlPage('<meta property="og:title" content="Scout on TikTok"><meta property="og:image" content="https://p16.test/og.jpg">'),
    });
    const result = await externalVideo.extract(ctx);
    expect(result).toMatchObject({ kind: 'video', title: 'Scout on TikTok', imageUrl: 'https://p16.test/og.jpg' });
  });

  it('returns a titled video card even when every source is blocked', async () => {
    const ctx = makeContext('https://www.tiktok.com/@scout2015/video/6718335390845095173', {
      json: { 'https://www.tiktok.com/oembed': new Error('blocked') },
      page: new Error('blocked'),
    });
    expect(await externalVideo.extract(ctx)).toMatchObject({ kind: 'video', title: 'TikTok', embed: { playableInline: false } });
  });

  it('falls back to open graph for instagram', async () => {
    const ctx = makeContext('https://www.instagram.com/reel/Cabc123/', {
      page: htmlPage('<meta property="og:title" content="A reel"><meta property="og:image" content="https://ig.test/i.jpg">'),
    });
    const result = await externalVideo.extract(ctx);
    expect(result).toMatchObject({ kind: 'video', title: 'A reel', embed: { provider: 'instagram', playableInline: false } });
  });
});
