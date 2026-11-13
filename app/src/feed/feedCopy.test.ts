/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { actionFor, counterText, movedNote } from './feedCopy.ts';

describe('actionFor', () => {
  it('reads articles and watches videos', () => {
    assert.deepEqual([actionFor('article'), actionFor('video')], ['Read', 'Watch']);
  });

  it('opens everything else, including items still fetching or that failed', () => {
    const others = (['post', 'image', 'link', 'pending', 'failed'] as const).map(actionFor);
    assert.deepEqual(others, ['Open', 'Open', 'Open', 'Open', 'Open']);
  });
});

describe('counterText', () => {
  it('counts from one', () => {
    assert.equal(counterText(3, 12), '4 of 12');
  });

  it('is hidden when the feed holds one item', () => {
    assert.equal(counterText(0, 1), null);
  });

  it('is hidden when the position is unknown', () => {
    assert.equal(counterText(-1, 12), null);
  });
});

describe('movedNote', () => {
  it('names where the item went', () => {
    assert.equal(movedNote('Recipes'), 'moved to Recipes');
  });

  it('still says it moved when the place is no longer on the device', () => {
    assert.equal(movedNote(null), 'moved');
  });
});
