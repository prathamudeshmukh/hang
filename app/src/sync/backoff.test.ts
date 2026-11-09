/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { backoffMs } from './backoff.ts';

const POLICY = { baseMs: 2000, maxMs: 300_000 };

describe('backoffMs', () => {
  it('doubles with each attempt', () => {
    assert.deepEqual([1, 2, 3, 4].map((attempt) => backoffMs(attempt, POLICY)), [2000, 4000, 8000, 16000]);
  });

  it('is capped', () => {
    assert.equal(backoffMs(30, POLICY), 300_000);
  });

  it('treats a non-positive attempt as the first', () => {
    assert.equal(backoffMs(0, POLICY), 2000);
  });
});
