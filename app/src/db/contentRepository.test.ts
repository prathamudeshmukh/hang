/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createContentRepository, OPENING_CHARS } from './contentRepository.ts';
import { itemContent } from './schema.ts';
import { createTestDeps } from './testing/testDb.ts';

describe('content repository', () => {
  let deps: ReturnType<typeof createTestDeps>;
  let content: ReturnType<typeof createContentRepository>;
  const insert = (itemId: string, text: string | null, deletedAt: string | null = null) =>
    deps.db.insert(itemContent).values({ itemId, text, deletedAt }).run();

  beforeEach(() => {
    deps = createTestDeps();
    content = createContentRepository(deps.db);
  });

  it('reads the opening of each item that has reader text', () => {
    insert('a', 'First.\n\nSecond.');
    insert('b', 'Other.');
    assert.deepEqual(content.openings(['a', 'b', 'c']), new Map([['a', 'First.\n\nSecond.'], ['b', 'Other.']]));
  });

  it('reads only the start of a long text', () => {
    insert('a', 'x'.repeat(OPENING_CHARS * 3));
    assert.equal(content.openings(['a']).get('a')?.length, OPENING_CHARS);
  });

  it('has no opening for deleted or empty content', () => {
    insert('a', 'Gone.', '2026-11-01T00:00:00Z');
    insert('b', '');
    insert('c', null);
    assert.equal(content.openings(['a', 'b', 'c']).size, 0);
  });

  it('tells whether one item has an opening, for the hero', () => {
    insert('a', 'Text.');
    assert.deepEqual([content.hasOpening('a'), content.hasOpening('z')], [true, false]);
  });
});
