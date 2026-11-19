/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFirstPullRepository } from './firstPullRepository.ts';
import { firstPull } from './schema.ts';
import { createTestDeps } from './testing/testDb.ts';

function setup() {
  const deps = createTestDeps();
  return { ...deps, firstPulls: createFirstPullRepository(deps) };
}

describe('first pull', () => {
  it('has not happened on a fresh install', () => {
    assert.equal(setup().firstPulls.hasPulled(), false);
  });

  it('is remembered once marked', () => {
    const t = setup();
    t.firstPulls.markPulled();
    assert.equal(t.firstPulls.hasPulled(), true);
  });

  it('keeps the time of the first pull when marked again', () => {
    const t = setup();
    t.firstPulls.markPulled();
    const first = t.db.select().from(firstPull).all();
    t.clock.advance(60_000);
    t.firstPulls.markPulled();
    assert.deepEqual(t.db.select().from(firstPull).all(), first);
  });
});
