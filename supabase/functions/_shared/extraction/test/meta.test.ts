import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { readMeta } from '../meta.ts';
import { fixture } from './helpers.ts';

describe('readMeta', () => {
  it('prefers open graph values and resolves relative image urls', () => {
    const meta = readMeta(fixture('article.html'), 'https://mag.test/essays/hyperlink');
    expect(meta.title).toBe('The Slow Death of the Hyperlink');
    expect(meta.imageUrl).toBe('https://mag.test/images/hyperlink.jpg');
    expect(meta.siteName).toBe('Example Magazine');
  });

  it('reads image dimensions, author and description', () => {
    const meta = readMeta(fixture('article.html'), 'https://mag.test/');
    expect(meta.imageWidth).toBe(1200);
    expect(meta.author).toBe('A. Writer');
    expect(meta.description).toBe('Why the web stopped linking out, and what we lost.');
  });

  it('falls back to <title> and twitter tags, and leaves missing values undefined', () => {
    const meta = readMeta('<html><head><title> Plain </title><meta name="twitter:image" content="https://i.test/x.png"></head></html>', 'https://p.test/');
    expect(meta.title).toBe('Plain');
    expect(meta.imageUrl).toBe('https://i.test/x.png');
    expect(meta.siteName).toBeUndefined();
  });

  it('ignores image urls that are not http(s)', () => {
    const meta = readMeta('<meta property="og:image" content="javascript:alert(1)">', 'https://p.test/');
    expect(meta.imageUrl).toBeUndefined();
  });
});
