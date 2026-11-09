import { describe, expect, it } from 'vitest';
import { article } from '../../src/adapters/article.ts';
import { directImage } from '../../src/adapters/directImage.ts';
import { imagePage } from '../../src/adapters/imagePage.ts';
import { generic } from '../../src/adapters/generic.ts';
import { fixture, htmlPage, makeContext } from '../helpers.ts';

describe('article adapter', () => {
  it('extracts readable content with reading time and og metadata', async () => {
    const ctx = makeContext('https://mag.test/essays/hyperlink', { page: htmlPage(fixture('article.html'), 'https://mag.test/essays/hyperlink') });
    const result = await article.extract(ctx);
    expect(result).toMatchObject({ kind: 'article', title: 'The Slow Death of the Hyperlink', siteName: 'Example Magazine' });
    expect(result?.readingMinutes).toBeGreaterThanOrEqual(1);
    expect(result?.contentHtml).not.toContain('<nav');
  });

  it('declines short marketing pages', async () => {
    const ctx = makeContext('https://acme.test/', { page: htmlPage(fixture('landing.html')) });
    expect(await article.extract(ctx)).toBeNull();
  });

  it('parses pages without html/body tags', async () => {
    const ctx = makeContext('https://bare.test/post', { page: htmlPage(fixture('article-bare.html'), 'https://bare.test/post') });
    const result = await article.extract(ctx);
    expect(result?.kind).toBe('article');
  });

  it('uses the first image in the article when there is no og:image', async () => {
    const ctx = makeContext('https://bare.test/post', { page: htmlPage(fixture('article-bare.html'), 'https://bare.test/post') });
    const result = await article.extract(ctx);
    expect(result?.imageUrl).toBe('https://bare.test/img/doorway.jpg');
  });

  it('declines link-heavy list pages', async () => {
    const ctx = makeContext('https://news.test/', { page: htmlPage(fixture('link-list.html'), 'https://news.test/') });
    expect(await article.extract(ctx)).toBeNull();
  });

  it('declines non-html responses', async () => {
    const ctx = makeContext('https://a.test/x', { page: { finalUrl: 'https://a.test/x', status: 200, contentType: 'application/pdf', body: '' } });
    expect(await article.extract(ctx)).toBeNull();
  });
});

describe('directImage adapter', () => {
  it('turns an image response into an image card titled by file name', async () => {
    const ctx = makeContext('https://img.test/posters/swiss.jpg', {
      page: { finalUrl: 'https://img.test/posters/swiss.jpg', status: 200, contentType: 'image/jpeg', body: '' },
    });
    expect(await directImage.extract(ctx)).toMatchObject({ kind: 'image', imageUrl: 'https://img.test/posters/swiss.jpg', title: 'swiss.jpg' });
  });

  it('declines html responses', async () => {
    const ctx = makeContext('https://img.test/', { page: htmlPage('<p>hi</p>') });
    expect(await directImage.extract(ctx)).toBeNull();
  });
});

describe('imagePage adapter', () => {
  const PIN = '<meta property="og:title" content="Swiss poster"><meta property="og:image" content="https://i.pinimg.test/x.jpg">';

  it('matches known image hosts only', () => {
    expect(imagePage.matches(new URL('https://www.pinterest.com/pin/123/'))).toBe(true);
    expect(imagePage.matches(new URL('https://dribbble.com/shots/1-x'))).toBe(true);
    expect(imagePage.matches(new URL('https://mag.test/a'))).toBe(false);
  });

  it('uses the og:image as the picture', async () => {
    const ctx = makeContext('https://www.pinterest.com/pin/123/', { page: htmlPage(PIN) });
    expect(await imagePage.extract(ctx)).toMatchObject({ kind: 'image', title: 'Swiss poster', imageUrl: 'https://i.pinimg.test/x.jpg' });
  });

  it('declines when the page has no image', async () => {
    const ctx = makeContext('https://www.pinterest.com/pin/123/', { page: htmlPage('<title>x</title>') });
    expect(await imagePage.extract(ctx)).toBeNull();
  });
});

describe('generic adapter', () => {
  it('builds a link card from open graph', async () => {
    const ctx = makeContext('https://acme.test/', { page: htmlPage(fixture('landing.html')) });
    expect(await generic.extract(ctx)).toMatchObject({ kind: 'link', title: 'Acme', imageUrl: 'https://cdn.acme.test/og.png' });
  });

  it('titles non-html files (pdfs) by their file name', async () => {
    const pdf = { finalUrl: 'https://fed.test/research/gordon-gekko-effect.pdf', status: 200, contentType: 'application/pdf', body: '' };
    const result = await generic.extract(makeContext('https://fed.test/research/gordon-gekko-effect.pdf', { page: pdf }));
    expect(result).toMatchObject({ kind: 'link', title: 'gordon-gekko-effect.pdf', siteName: 'fed.test' });
  });

  it('still returns a link card titled by hostname when the page cannot be fetched', async () => {
    const ctx = makeContext('https://www.blocked.test/some/path', { page: new Error('403') });
    expect(await generic.extract(ctx)).toEqual({ kind: 'link', adapter: 'generic', url: 'https://www.blocked.test/some/path', title: 'blocked.test', siteName: 'blocked.test' });
  });
});
