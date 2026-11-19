/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { wallState } from './homeWall.ts';

const NOTHING = { hasItems: false, hasPulled: false, syncFailed: false } as const;

describe('wallState (#75)', () => {
  it('waits while the first pull is still bringing the wall over', () => {
    assert.equal(wallState(NOTHING), 'waiting');
  });

  it('is empty once the first pull found nothing', () => {
    assert.equal(wallState({ ...NOTHING, hasPulled: true }), 'empty');
  });

  it('shows the how-to instead of waiting when the first pull failed', () => {
    assert.equal(wallState({ ...NOTHING, syncFailed: true }), 'empty');
  });

  it('hangs whatever is on the device, even before the first pull (shares made before sign-in)', () => {
    assert.equal(wallState({ ...NOTHING, hasItems: true }), 'hanging');
  });

  it('hangs items after the first pull, whatever the last sync did', () => {
    assert.equal(wallState({ hasItems: true, hasPulled: true, syncFailed: true }), 'hanging');
  });
});
