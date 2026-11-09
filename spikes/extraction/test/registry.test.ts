import { describe, expect, it } from 'vitest';
import { ADAPTERS, extract } from '../src/registry.ts';
import type { ContentSource } from '../src/types.ts';
import { fixture, htmlPage, makeContext } from './helpers.ts';

const declining: ContentSource = { name: 'declining', matches: () => true, extract: async () => null };
const throwing: ContentSource = { name: 'throwing', matches: () => true, extract: async () => { throw new Error('boom'); } };

describe('ADAPTERS order', () => {
  it('ends with the generic adapter', () => {
    expect(ADAPTERS.at(-1)?.name).toBe('generic');
  });

  it('tries URL-specific adapters before content-based ones', () => {
    const names = ADAPTERS.map((a) => a.name);
    expect(names.indexOf('youtube')).toBeLessThan(names.indexOf('article'));
    expect(names.indexOf('imagePage')).toBeLessThan(names.indexOf('article'));
  });
});

describe('extract', () => {
  const landing = () => makeContext('https://acme.test/', { page: htmlPage(fixture('landing.html')) });

  it('routes an article page to the article adapter', async () => {
    const ctx = makeContext('https://mag.test/e', { page: htmlPage(fixture('article.html'), 'https://mag.test/e') });
    const result = await extract(ctx);
    expect(result.extracted.adapter).toBe('article');
    expect(result.errors).toEqual([]);
  });

  it('skips declining adapters and lands on generic', async () => {
    const result = await extract(landing(), [declining, ...ADAPTERS]);
    expect(result.extracted).toMatchObject({ adapter: 'generic', kind: 'link' });
  });

  it('records an adapter that throws and still falls back to generic', async () => {
    const result = await extract(landing(), [throwing, ...ADAPTERS]);
    expect(result.extracted.adapter).toBe('generic');
    expect(result.errors).toEqual([{ adapter: 'throwing', message: 'boom' }]);
  });
});
