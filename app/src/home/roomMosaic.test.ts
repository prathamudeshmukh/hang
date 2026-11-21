/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { roomColours } from '../rooms/roomColours.ts';
import { roomMosaic } from './roomMosaic.ts';

const GREEN_ROOM = roomColours({ kind: 'family', family: 4, base: { h: 128, s: 0.6, l: 0.4 } })!;
const ROOM = { count: 5, pictures: [], colours: null, newestWords: 'On boredom' } as const;
const BLANK = { kind: 'blank' } as const;

describe('roomMosaic (#106)', () => {
  it('hangs the newest picture large and the next two beside it', () => {
    const mosaic = roomMosaic({ ...ROOM, pictures: ['a', 'b', 'c'], colours: GREEN_ROOM });
    assert.deepEqual(mosaic, [{ kind: 'picture', uri: 'a' }, { kind: 'picture', uri: 'b' }, { kind: 'picture', uri: 'c' }]);
  });

  it('fills the cells its pictures cannot with the room\'s shades', () => {
    const mosaic = roomMosaic({ ...ROOM, pictures: ['a'], colours: GREEN_ROOM });
    assert.deepEqual(mosaic, [{ kind: 'picture', uri: 'a' }, { kind: 'shade', at: 1 }, { kind: 'shade', at: 2 }]);
  });

  it('shows only shades while a coloured room\'s pictures are still downloading', () => {
    const mosaic = roomMosaic({ ...ROOM, colours: GREEN_ROOM });
    assert.deepEqual(mosaic, [{ kind: 'shade', at: 0 }, { kind: 'shade', at: 1 }, { kind: 'shade', at: 2 }]);
  });

  it('leaves the spare cells as paper when the room has pictures but no colour yet', () => {
    const mosaic = roomMosaic({ ...ROOM, pictures: ['a'] });
    assert.deepEqual(mosaic, [{ kind: 'picture', uri: 'a' }, BLANK, BLANK]);
  });

  it('sets a room of words\' newest title in the large cell', () => {
    assert.deepEqual(roomMosaic(ROOM), [{ kind: 'words', text: 'On boredom' }, BLANK, BLANK]);
  });

  it('is three plain cells for an empty room, even one that kept a colour', () => {
    const mosaic = roomMosaic({ ...ROOM, count: 0, pictures: ['a'], colours: GREEN_ROOM });
    assert.deepEqual(mosaic, [BLANK, BLANK, BLANK]);
  });

  it('is plain paper when a room of words has nothing to say', () => {
    assert.deepEqual(roomMosaic({ ...ROOM, newestWords: null }), [BLANK, BLANK, BLANK]);
  });
});
