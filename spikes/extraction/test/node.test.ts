import { describe, expect, it } from 'vitest';
import { isPrivateAddress, assertFetchableUrl } from '../src/node/guard.ts';
import { parseLinks } from '../src/node/links.ts';
import { score } from '../src/score.ts';

describe('isPrivateAddress', () => {
  it('flags loopback, private, link-local and metadata ranges', () => {
    expect(['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.1', '169.254.169.254'].every(isPrivateAddress)).toBe(true);
    expect(['::1', 'fc00::1', 'fe80::1', '::ffff:127.0.0.1'].every(isPrivateAddress)).toBe(true);
  });

  it('allows public addresses', () => {
    expect(['8.8.8.8', '172.32.0.1', '2606:4700::1111'].some(isPrivateAddress)).toBe(false);
  });
});

describe('assertFetchableUrl', () => {
  const lookup = (address: string) => async () => [{ address, family: 4 }];

  it('rejects non-http schemes', async () => {
    await expect(assertFetchableUrl(new URL('file:///etc/passwd'), lookup('8.8.8.8'))).rejects.toThrow(/scheme/);
  });

  it('rejects hosts that resolve to private addresses', async () => {
    await expect(assertFetchableUrl(new URL('https://evil.test/'), lookup('10.0.0.5'))).rejects.toThrow(/private/);
  });

  it('rejects private hosts in normalised url forms', async () => {
    const urls = ['http://[::ffff:7f00:1]/', 'http://2130706433/', 'http://[::1]/', 'http://0.0.0.0/', 'http://[64:ff9b::a9fe:a9fe]/'];
    const results = await Promise.allSettled(urls.map((u) => assertFetchableUrl(new URL(u), lookup('8.8.8.8'))));
    expect(results.map((r) => r.status)).toEqual(urls.map(() => 'rejected'));
  });

  it('rejects hosts that resolve to nothing', async () => {
    await expect(assertFetchableUrl(new URL('https://void.test/'), async () => [])).rejects.toThrow(/private/);
  });

  it('accepts public hosts', async () => {
    await expect(assertFetchableUrl(new URL('https://ok.test/'), lookup('93.184.216.34'))).resolves.toBeUndefined();
  });
});

describe('parseLinks', () => {
  it('reads urls with optional expected kind and skips comments and blanks', () => {
    const links = parseLinks('# header\n\nhttps://youtu.be/a  # video\nhttps://mag.test/e\n');
    expect(links).toEqual([{ url: 'https://youtu.be/a', expected: 'video' }, { url: 'https://mag.test/e' }]);
  });

  it('ignores unknown expected kinds and invalid urls', () => {
    expect(parseLinks('https://a.test # banana\nnot a url')).toEqual([{ url: 'https://a.test' }]);
  });
});

describe('score', () => {
  const ok = { kind: 'article', title: 'T', imageUrl: 'https://i/x.jpg' } as const;

  it('counts a result as usable when it has a title and image, and kind matches when expected', () => {
    const summary = score([
      { expected: 'article', extracted: ok },
      { expected: 'video', extracted: ok },
      { extracted: { kind: 'link', title: 'T' } },
    ]);
    expect(summary).toEqual({ total: 3, withExpectation: 2, kindCorrect: 1, usable: 2, passRate: 1 / 3 });
  });

  it('accepts text-only articles and posts (the design has typeset cards) but not image-less videos or links', () => {
    const rows = (['article', 'post', 'video', 'link'] as const).map((kind) => ({ extracted: { kind, title: 'T' } }));
    expect(score(rows).usable).toBe(2);
  });

  it('handles an empty run', () => {
    expect(score([]).passRate).toBe(0);
  });
});
