/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HOWTO_STEPS, stepLabel } from './howtoCopy.ts';
import { HOWTO_STEP_ORDER } from './howtoShapes.ts';

describe('howtoCopy (#75, DESIGN.md §9)', () => {
  it('teaches three steps, ending on Hang', () => {
    assert.deepEqual(HOWTO_STEPS.map(({ name }) => name), ['Open anything', 'Tap Share', 'Pick Hang']);
  });

  it('has words for every drawn step, and no more', () => {
    assert.equal(HOWTO_STEPS.length, HOWTO_STEP_ORDER.length);
  });

  it('reads each step aloud with its place, name and note', () => {
    assert.equal(stepLabel(2), 'Step 3 of 3, Pick Hang. It may be under More.');
  });

  it('refuses a step that is not there', () => {
    assert.throws(() => stepLabel(3), /no step 4/i);
  });
});
