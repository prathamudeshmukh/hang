/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Item } from '../db/schema.ts';
import { toCardModel } from '../grid/cardModel.ts';
import { anItem, CARD_NOW } from '../grid/testing/anItem.ts';
import { FRAME, lookOf } from './look.ts';

const THUMB = 'file:///thumb.jpg';
const TALL = { thumbW: 400, thumbH: 1200 } as const;
const cardOf = (overrides: Partial<Item>, thumb: string | null = THUMB) => toCardModel(anItem({ status: 'ready', ...overrides }), thumb, CARD_NOW);

describe('lookOf', () => {
  it('flies an image’s thumbnail and lands it whole, at its own ratio', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'image', ...TALL })), { kind: 'picture', uri: THUMB, landing: { fit: 'contain', ratio: 3 } });
  });

  it('flies a video poster to the media box, at its own ratio (#95)', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'video', ...TALL })), { kind: 'picture', uri: THUMB, landing: { fit: 'media', ratio: 3 } });
  });

  it('flies an empty frame for a text face (decision 2), to the whole page: it is a label page (#109)', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'link', title: 'On boredom' })), { kind: 'frame', landing: { fit: 'page' } });
  });

  it('flies a pictureless video to the label page too (#109)', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'video', title: 'On boredom' })).landing, { fit: 'page' });
  });

  it('flies a fetching print to the media box, where the page draws it waiting', () => {
    assert.equal(lookOf(cardOf({ status: 'extracting' })), FRAME);
  });

  it('flies an empty frame for a post, even with an image, to the words’ place (#59)', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'post', post: { text: 'A thread' }, ...TALL })), { kind: 'frame', landing: { fit: 'words' } });
  });

  it('flies an empty frame to the text block for an imageless article with an opening (#61)', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'article', title: 'On boredom' }), true), { kind: 'frame', landing: { fit: 'text' } });
  });

  it('still flies an article’s picture when it has an opening', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'article', ...TALL }), true), { kind: 'picture', uri: THUMB, landing: { fit: 'media', ratio: 3 } });
  });

  it('flies an empty frame while the thumbnail is not on the device yet', () => {
    assert.equal(lookOf(cardOf({ kind: 'image', ...TALL }, null)), FRAME);
  });
});
