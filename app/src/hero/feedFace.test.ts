/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrintSwatch } from '../rooms/roomOf.ts';
import { SCREENING_ROOM } from '../theme/tokens.ts';
import { feedFace } from './feedFace.ts';

const swatch = (top: string) => ({ colour: top, top, end: top, ink: '#000' });
const PAPER: PrintSwatch = { light: swatch('#f0d0c0'), dark: swatch('#5a2a20') };

describe('feedFace', () => {
  it('lands a post in the screen’s own colour, so it melts into the page (#59)', () => {
    assert.equal(feedFace({ landing: { fit: 'words' }, paper: PAPER }), SCREENING_ROOM.wall);
  });

  it('lands a label page in its room colour as the screening room draws it (#109)', () => {
    assert.equal(feedFace({ landing: { fit: 'page' }, paper: PAPER }), '#5a2a20');
  });

  it('lands an unsorted label page on plain raised paper', () => {
    assert.equal(feedFace({ landing: { fit: 'page' }, paper: null }), SCREENING_ROOM.raised);
  });

  it('lands everything else on the media box’s raised', () => {
    assert.equal(feedFace({ landing: { fit: 'cover' }, paper: PAPER }), SCREENING_ROOM.raised);
  });
});
