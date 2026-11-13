/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Item } from '../db/schema.ts';
import { toCardModel } from '../grid/cardModel.ts';
import { anItem } from '../grid/testing/anItem.ts';
import { FRAME, landingOf, lookOf } from './look.ts';

const THUMB = 'file:///thumb.jpg';
const TALL = { thumbW: 400, thumbH: 1200 } as const;
const cardOf = (overrides: Partial<Item>, thumb: string | null = THUMB) => toCardModel(anItem({ status: 'ready', ...overrides }), thumb);

describe('lookOf', () => {
  it('flies an image’s thumbnail and lands it whole, at its own ratio', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'image', ...TALL })), { kind: 'picture', uri: THUMB, landing: { fit: 'contain', ratio: 3 } });
  });

  it('flies a video poster to fill the media box', () => {
    assert.deepEqual(lookOf(cardOf({ kind: 'video', ...TALL })), { kind: 'picture', uri: THUMB, landing: { fit: 'cover' } });
  });

  it('flies an empty frame for a text face (decision 2)', () => {
    assert.equal(lookOf(cardOf({ kind: 'article', title: 'On boredom' })), FRAME);
  });

  it('flies an empty frame for a post, even with an image', () => {
    assert.equal(lookOf(cardOf({ kind: 'post', post: { text: 'A thread' }, ...TALL })), FRAME);
  });

  it('flies an empty frame while the thumbnail is not on the device yet', () => {
    assert.equal(lookOf(cardOf({ kind: 'image', ...TALL }, null)), FRAME);
  });
});

describe('landingOf', () => {
  it('lands a frame on the media box', () => {
    assert.deepEqual(landingOf(FRAME), { fit: 'cover' });
  });
});
