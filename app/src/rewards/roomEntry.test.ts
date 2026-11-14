/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { roomEntry } from './roomEntry.ts';

describe('roomEntry', () => {
  it('draws the underline in when a collection is entered', () => {
    assert.equal(roomEntry({ place: 'collection', reduceMotion: false }), 'draw');
  });

  it('shows it already drawn under reduce motion', () => {
    assert.equal(roomEntry({ place: 'collection', reduceMotion: true }), 'drawn');
  });

  it('has no underline in the Inbox, which is not a room', () => {
    assert.equal(roomEntry({ place: 'inbox', reduceMotion: false }), 'none');
  });
});
