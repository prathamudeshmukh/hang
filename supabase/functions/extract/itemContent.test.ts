import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import type { Extracted } from '../_shared/extraction/types.ts';
import { toItemContent } from './itemContent.ts';
import type { ClaimedItem } from './types.ts';

const item: ClaimedItem = { id: 'i1', userId: 'u1', sourceUrl: 'https://mag.test/a', sharedTitle: null };
const article: Extracted = {
  kind: 'article',
  adapter: 'article',
  url: 'https://mag.test/a',
  contentHtml: '<div><p>One two.</p><p>Three.</p></div>',
  contentText: 'One two.\n\nThree.',
};

describe('toItemContent', () => {
  it("keeps an article's reader html and paragraph text, owned by the item's owner", () => {
    expect(toItemContent(item, article)).toEqual({
      item_id: 'i1',
      user_id: 'u1',
      html: article.contentHtml,
      text: 'One two.\n\nThree.',
      word_count: 3,
    });
  });

  it('has nothing to keep for an article without running text', () => {
    expect(toItemContent(item, { ...article, contentText: '' })).toBeNull();
  });

  it('has nothing to keep for other kinds', () => {
    expect(toItemContent(item, { ...article, kind: 'link', adapter: 'generic' })).toBeNull();
  });
});
