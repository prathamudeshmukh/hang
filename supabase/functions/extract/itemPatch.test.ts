import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import type { Extracted } from '../_shared/extraction/types.ts';
import { toItemPatch } from './itemPatch.ts';
import type { ClaimedItem } from './types.ts';

const item: ClaimedItem = { id: 'i1', sourceUrl: 'https://www.mag.test/a?utm_source=x&id=7', sharedTitle: null };
const link: Extracted = { kind: 'link', adapter: 'generic', url: 'https://www.mag.test/a?utm_source=x&id=7' };

describe('toItemPatch', () => {
  it('marks the item ready with kind, adapter, site and a tracking-free canonical url', () => {
    const patch = toItemPatch(item, { ...link, title: 'Hello', siteName: 'Mag' });
    expect(patch).toMatchObject({ status: 'ready', extract_error: null, kind: 'link', adapter: 'generic', site_name: 'Mag' });
    expect(patch.canonical_url).toBe('https://www.mag.test/a?id=7');
  });

  it('keeps the extracted title as both title and raw_title', () => {
    expect(toItemPatch(item, { ...link, title: '  Hello  ' })).toMatchObject({ title: 'Hello', raw_title: 'Hello' });
  });

  it('falls back to the shared title, then the hostname, when nothing was extracted', () => {
    expect(toItemPatch({ ...item, sharedTitle: 'Shared' }, link)).toMatchObject({ title: 'Shared', raw_title: null });
    expect(toItemPatch(item, link)).toMatchObject({ title: 'mag.test', site_name: 'mag.test' });
  });

  it('clears every derived field it has no value for, so a rerun overwrites stale data', () => {
    const patch = toItemPatch(item, { ...link, title: 't' });
    expect(patch).toMatchObject({ author: null, duration_s: null, reading_min: null, embed: null, post: null });
  });

  it('never writes the user fields', () => {
    const keys = Object.keys(toItemPatch(item, link));
    expect(keys.filter((k) => ['collection_id', 'read_at', 'progress', 'shared_title', 'source_url'].includes(k))).toEqual([]);
  });

  it('maps an embed to snake_case and rounds durations to whole seconds', () => {
    const video: Extracted = { ...link, kind: 'video', adapter: 'vimeo', durationSeconds: 61.6, embed: { provider: 'vimeo', videoId: '42', playableInline: true } };
    expect(toItemPatch(item, video)).toMatchObject({ duration_s: 62, embed: { provider: 'vimeo', video_id: '42', playable_inline: true } });
  });

  it('maps a post snapshot to snake_case with an ISO posted_at', () => {
    const post: Extracted = {
      ...link, kind: 'post', adapter: 'xPost', readingMinutes: 2,
      post: { authorName: 'Ada', handle: 'ada', avatarUrl: 'https://p.test/a.png', text: 'hi', mediaUrls: ['https://p.test/1.jpg'], postedAt: 'Wed Oct 10 20:19:24 +0000 2018' },
    };
    expect(toItemPatch(item, post)).toMatchObject({
      reading_min: 2,
      post: { author: 'Ada', handle: 'ada', avatar: 'https://p.test/a.png', text: 'hi', media: ['https://p.test/1.jpg'], posted_at: '2018-10-10T20:19:24.000Z' },
    });
  });

  it('drops a posted_at it cannot parse instead of storing garbage', () => {
    const post: Extracted = { ...link, kind: 'post', post: { authorName: 'A', handle: 'a', text: '', mediaUrls: [], postedAt: 'yesterday-ish' } };
    expect(toItemPatch(item, post).post).toEqual({ author: 'A', handle: 'a', avatar: null, text: '', media: [], posted_at: null });
  });

  it('caps very long titles', () => {
    const patch = toItemPatch(item, { ...link, title: 'x'.repeat(5000) });
    expect(patch.title?.length).toBeLessThanOrEqual(500);
  });

  it('keeps the lead image as an absolute http(s) image_url, else a post\'s first media', () => {
    const post: Extracted = { ...link, kind: 'post', post: { authorName: 'A', handle: 'a', text: '', mediaUrls: ['https://p.test/1.jpg'] } };
    const images = [
      toItemPatch(item, { ...link, imageUrl: '/img/lead.png' }).image_url,
      toItemPatch(item, post).image_url,
      toItemPatch(item, link).image_url,
    ];
    expect(images).toEqual(['https://www.mag.test/img/lead.png', 'https://p.test/1.jpg', null]);
  });

  it('drops an image address that is not http(s) or is too long', () => {
    const bad = ['data:image/png;base64,AAAA', 'javascript:alert(1)', `https://cdn.test/${'x'.repeat(5000)}`];
    expect(bad.map((imageUrl) => toItemPatch(item, { ...link, imageUrl }).image_url)).toEqual([null, null, null]);
  });
});
