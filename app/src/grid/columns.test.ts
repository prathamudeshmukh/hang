/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { columnsFor } from './columns.ts';

describe('columnsFor', () => {
  it('uses two columns up to 150% font scale', () => {
    assert.equal(columnsFor(1), 2);
    assert.equal(columnsFor(1.5), 2);
  });

  it('drops to one column above 150%', () => {
    assert.equal(columnsFor(1.6), 1);
    assert.equal(columnsFor(2), 1);
  });

  it('keeps two columns for a nonsense scale', () => {
    assert.equal(columnsFor(Number.NaN), 2);
  });
});
