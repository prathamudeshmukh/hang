import { describe, expect, it } from 'vitest';
import { fileNameFromUrl, stripTracking, youTubeVideoId } from '../src/url.ts';

describe('youTubeVideoId', () => {
  it('reads the id from watch, short, shorts and embed urls', () => {
    expect(youTubeVideoId(new URL('https://www.youtube.com/watch?v=abc123XYZ_0&t=4'))).toBe('abc123XYZ_0');
    expect(youTubeVideoId(new URL('https://youtu.be/abc123XYZ_0?si=x'))).toBe('abc123XYZ_0');
    expect(youTubeVideoId(new URL('https://m.youtube.com/shorts/abc123XYZ_0'))).toBe('abc123XYZ_0');
  });

  it('returns undefined for non-video youtube pages', () => {
    expect(youTubeVideoId(new URL('https://www.youtube.com/@channel'))).toBeUndefined();
  });
});

describe('fileNameFromUrl', () => {
  it('returns the raw segment when the escape is malformed', () => {
    expect(fileNameFromUrl(new URL('https://a.test/clip%E0.mp4'))).toBe('clip%E0.mp4');
  });
});

describe('stripTracking', () => {
  it('removes utm and click-id params but keeps meaningful ones', () => {
    const cleaned = stripTracking(new URL('https://a.test/p?id=7&utm_source=x&fbclid=1&gclid=2'));
    expect(cleaned.toString()).toBe('https://a.test/p?id=7');
  });

  it('does not mutate the input url', () => {
    const original = new URL('https://a.test/p?utm_medium=y');
    stripTracking(original);
    expect(original.search).toBe('?utm_medium=y');
  });
});
