import { expect } from '@std/expect';
import { beforeEach, describe, it } from '@std/testing/bdd';
import type { ClaimedItem, ContentRow } from '../../extract/types.ts';
import { type BackfillStore, runBackfill } from './backfill.ts';

const article = (id: string): ClaimedItem => ({ id, userId: 'u1', sourceUrl: `https://mag.test/${id}`, sharedTitle: null });
const content = (item: ClaimedItem): ContentRow => ({ item_id: item.id, user_id: item.userId, html: '<p>Hi.</p>', text: 'Hi.', word_count: 1 });

describe('runBackfill', () => {
  let saved: ContentRow[];
  let lines: string[];
  beforeEach(() => {
    saved = [];
    lines = [];
  });

  const store = (articles: readonly ClaimedItem[]): BackfillStore => ({
    listArticlesWithoutContent: () => Promise.resolve(articles),
    saveContent: (row) => {
      saved.push(row);
      return Promise.resolve();
    },
  });

  const run = (articles: readonly ClaimedItem[], apply: boolean) =>
    runBackfill({
      store: store(articles),
      readContent: (item) => (item.id === 'gone' ? Promise.reject(new Error('HTTP 404 https://mag.test/gone')) : Promise.resolve(item.id === 'stub' ? null : content(item))),
      apply,
      print: (line) => lines.push(line),
    });

  it('saves the text it finds when applied', async () => {
    await run([article('a'), article('b')], true);
    expect(saved.map(({ item_id }) => item_id)).toEqual(['a', 'b']);
  });

  it('writes nothing on a dry run but says what it would save', async () => {
    await run([article('a'), article('stub')], false);
    expect(saved).toEqual([]);
    expect(lines.at(-1)).toBe('2 articles without text: 1 with text found, 1 without (dry run: nothing changed)');
  });

  it('skips an article whose page fails, printing its id and never its address', async () => {
    await run([article('gone'), article('a')], true);
    expect(saved.map(({ item_id }) => item_id)).toEqual(['a']);
    expect(lines.join('\n')).not.toContain('mag.test');
  });
});
