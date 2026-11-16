/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { dayWords } from './dayWords.ts';

describe('dayWords', () => {
  const TODAY = new Date('2026-11-14T09:00:00');

  it('says today and yesterday in words', () => {
    assert.deepEqual([dayWords(new Date('2026-11-14T00:30:00'), TODAY), dayWords(new Date('2026-11-13T23:30:00'), TODAY)], ['today', 'yesterday']);
  });

  it('gives the day and short month, with the year only when it is not this one', () => {
    assert.deepEqual([dayWords(new Date('2026-11-03T10:00:00'), TODAY), dayWords(new Date('2025-12-24T10:00:00'), TODAY)], ['3 Nov', '24 Dec 2025']);
  });
});
