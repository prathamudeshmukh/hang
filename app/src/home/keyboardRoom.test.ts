/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { keyboardRoom } from './keyboardRoom.ts';

const KEYS_UP = 300;

describe('keyboardRoom (#111)', () => {
  it('pads by the keyboard and scrolls to the field while Home names a room', () => {
    assert.deepEqual(keyboardRoom({ naming: true, keyboardHeight: KEYS_UP }), { bottomPadding: KEYS_UP, scrollToEnd: true });
  });

  it('leaves Home alone when another field (the share sheet, Move) raised the keyboard', () => {
    assert.deepEqual(keyboardRoom({ naming: false, keyboardHeight: KEYS_UP }), { bottomPadding: 0, scrollToEnd: false });
  });

  it('waits for the keyboard before scrolling a freshly focused field', () => {
    assert.deepEqual(keyboardRoom({ naming: true, keyboardHeight: 0 }), { bottomPadding: 0, scrollToEnd: false });
  });
});
