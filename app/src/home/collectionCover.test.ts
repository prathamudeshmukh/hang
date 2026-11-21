/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { roomColours } from '../rooms/roomColours.ts';
import { collectionCover } from './collectionCover.ts';

const GREEN_ROOM = roomColours({ kind: 'family', family: 4, base: { h: 128, s: 0.6, l: 0.4 } })!;
const ROW = { name: 'kitchen', count: 3, coverUri: null, colours: null } as const;

describe('collectionCover (#96)', () => {
  it('shows the newest picture when there is one', () => {
    assert.deepEqual(collectionCover({ ...ROW, coverUri: 'file:///k.webp', colours: GREEN_ROOM }), { kind: 'picture', uri: 'file:///k.webp' });
  });

  it('fills with the room colour while its picture has not come', () => {
    assert.deepEqual(collectionCover({ ...ROW, colours: GREEN_ROOM }), { kind: 'colour', colours: GREEN_ROOM });
  });

  it('sets a room of words as its initial on paper', () => {
    assert.deepEqual(collectionCover(ROW), { kind: 'initial', letter: 'K' });
  });

  it('leaves an empty room as plain paper, even with a stale colour', () => {
    assert.deepEqual(collectionCover({ ...ROW, count: 0, colours: GREEN_ROOM }), { kind: 'empty' });
  });

  it('takes a whole first letter, not half of one', () => {
    assert.deepEqual(collectionCover({ ...ROW, name: '  🌿 plants' }), { kind: 'initial', letter: '🌿' });
  });
});
