import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { linkKey } from './linkKey.ts';

const same = (a: string, b: string) => expect(linkKey(a)).toBe(linkKey(b));

describe('linkKey', () => {
  it('ignores scheme, host case and www/m/mobile prefixes', () => {
    same('http://WWW.Example.com/a', 'https://example.com/a');
    same('https://m.example.com/a', 'https://example.com/a');
    same('https://mobile.example.com/a', 'https://example.com/a');
  });

  it('ignores tracking parameters, parameter order, the fragment and a trailing slash', () => {
    same('https://example.com/a/?utm_source=x&b=2&a=1&fbclid=z#top', 'https://example.com/a?a=1&b=2');
  });

  it('keeps pages apart when a real parameter or the path case differs', () => {
    expect(linkKey('https://example.com/item?id=1')).not.toBe(linkKey('https://example.com/item?id=2'));
    expect(linkKey('https://example.com/Docs')).not.toBe(linkKey('https://example.com/docs'));
  });

  it('reduces every YouTube form to the video id', () => {
    const forms = [
      'https://youtu.be/dQw4w9WgXcQ?si=abc',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42',
      'https://m.youtube.com/shorts/dQw4w9WgXcQ',
      'https://music.youtube.com/watch?feature=share&v=dQw4w9WgXcQ',
    ];
    expect(new Set(forms.map(linkKey))).toEqual(new Set(['youtube:dQw4w9WgXcQ']));
  });

  it('keeps different ports apart', () => {
    expect(linkKey('http://localhost:3000/x')).not.toBe(linkKey('http://localhost:8080/x'));
  });

  it('treats a site root with or without its slash as one page', () => {
    same('https://example.com', 'https://example.com/');
  });

  it('has no key for something that is not a web link', () => {
    expect([linkKey('mailto:a@b.c'), linkKey('not a url'), linkKey('')]).toEqual([null, null, null]);
  });
});
