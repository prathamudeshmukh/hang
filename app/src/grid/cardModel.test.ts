/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampRatio, MAX_RATIO, MIN_RATIO, sameCard, toCardModel } from './cardModel.ts';
import { anItem } from './testing/anItem.ts';

const THUMB = 'file:///thumbs/i1.webp';
const ready = (overrides: Parameters<typeof anItem>[0]) => anItem({ status: 'ready', title: 'On boredom', siteName: 'Aeon', ...overrides });

describe('clampRatio', () => {
  it('keeps a ratio inside the limits', () => {
    assert.equal(clampRatio({ width: 1000, height: 1250 }), 1.25);
  });

  it('crops a tall screenshot and a wide panorama to the limits', () => {
    assert.equal(clampRatio({ width: 1080, height: 2340 }), MAX_RATIO);
    assert.equal(clampRatio({ width: 3000, height: 1000 }), MIN_RATIO);
  });

  it('is null without a usable size', () => {
    assert.equal(clampRatio({ width: null, height: 600 }), null);
    assert.equal(clampRatio({ width: 0, height: 600 }), null);
  });
});

describe('toCardModel: status', () => {
  it('shows a pending or extracting item as fetching, whatever it has', () => {
    const card = toCardModel(anItem({ status: 'extracting', thumbW: 100, thumbH: 100 }), THUMB);
    assert.deepEqual([card.variant, card.note, card.media], ['pending', 'fetching…', null]);
  });

  it('shows a failed item like a link, with what was found', () => {
    const card = toCardModel(anItem({ status: 'failed', sharedTitle: 'Shared title' }), null);
    assert.deepEqual([card.variant, card.title, card.note], ['failed', 'Shared title', 'couldn’t read this']);
  });

  it('treats a ready item with no kind as a link', () => {
    assert.equal(toCardModel(ready({ kind: null }), null).variant, 'link');
  });
});

describe('toCardModel: media', () => {
  it('holds the box at the clamped ratio before the file is on the device', () => {
    const card = toCardModel(ready({ kind: 'article', thumbW: 1000, thumbH: 500 }), null);
    assert.deepEqual(card.media, { ratio: 0.5, naturalRatio: 0.5, uri: null });
  });

  it('carries the downloaded file', () => {
    const card = toCardModel(ready({ kind: 'image', thumbW: 800, thumbH: 1000 }), THUMB);
    assert.deepEqual(card.media, { ratio: 1.25, naturalRatio: 1.25, uri: THUMB });
  });

  it('keeps the unclamped ratio, so a whole image can be fitted in the feed (#32)', () => {
    const card = toCardModel(ready({ kind: 'image', thumbW: 400, thumbH: 1200 }), THUMB);
    assert.deepEqual(card.media, { ratio: 1.6, naturalRatio: 3, uri: THUMB });
  });

  it('has no media without a thumbnail size, so it becomes a text card', () => {
    assert.equal(toCardModel(ready({ kind: 'article' }), THUMB).media, null);
  });
});

describe('toCardModel: notes', () => {
  it('gives an article its reading time and site', () => {
    assert.equal(toCardModel(ready({ kind: 'article', readingMin: 9 }), null).note, '9 min · Aeon');
  });

  it('falls back to the host when there is no site name', () => {
    assert.equal(toCardModel(ready({ kind: 'article', siteName: null }), null).note, 'aeon.co');
  });

  it('gives an inline video its duration and site', () => {
    const card = toCardModel(ready({ kind: 'video', siteName: 'YouTube', durationS: 840, embed: { provider: 'youtube', playable_inline: true } }), null);
    assert.equal(card.note, '14 min · YouTube');
  });

  it('says a video that plays elsewhere opens in its app', () => {
    const card = toCardModel(ready({ kind: 'video', siteName: 'TikTok', embed: { provider: 'tiktok', playable_inline: false } }), null);
    assert.equal(card.note, 'opens in TikTok');
  });

  it('names a post by its handle, or its site without one', () => {
    assert.equal(toCardModel(ready({ kind: 'post', post: { handle: 'jack', text: 'hi' } }), null).note, 'post · @jack');
    assert.equal(toCardModel(ready({ kind: 'post', post: { handle: 42 } }), null).note, 'post · Aeon');
  });

  it('notes an image and a link by site', () => {
    assert.equal(toCardModel(ready({ kind: 'image' }), null).note, 'image · Aeon');
    assert.equal(toCardModel(ready({ kind: 'link' }), null).note, 'Aeon');
  });
});

describe('toCardModel: content', () => {
  it('takes the post text only when it is text', () => {
    assert.equal(toCardModel(ready({ kind: 'post', post: { text: 'just setting up' } }), null).postText, 'just setting up');
    assert.equal(toCardModel(ready({ kind: 'post', post: { text: ['no'] } }), null).postText, null);
  });

  it('prefers the extracted title, then the shared one', () => {
    assert.equal(toCardModel(anItem({ status: 'ready', title: null, sharedTitle: 'Shared' }), null).title, 'Shared');
    assert.equal(toCardModel(anItem({ status: 'ready' }), null).title, null);
  });

  it('describes the card as kind, title, note', () => {
    const card = toCardModel(ready({ kind: 'article', readingMin: 9 }), null);
    assert.equal(card.accessibilityLabel, 'article, On boredom, 9 min · Aeon');
  });

  it('describes a pending card without guessing its kind', () => {
    const card = toCardModel(anItem({ status: 'pending' }), null);
    assert.equal(card.accessibilityLabel, 'aeon.co, fetching…');
  });

  it('does not repeat the site when an untitled card already notes it', () => {
    const card = toCardModel(ready({ kind: 'link', title: null }), null);
    assert.equal(card.accessibilityLabel, 'link, Aeon');
  });
});

describe('sameCard', () => {
  const item = ready({ kind: 'image', thumbW: 100, thumbH: 100 });

  it('treats a rebuilt card with the same content as the same', () => {
    assert.equal(sameCard(toCardModel(item, THUMB), toCardModel(item, THUMB)), true);
  });

  it('sees a thumbnail landing', () => {
    assert.equal(sameCard(toCardModel(item, null), toCardModel(item, THUMB)), false);
  });

  it('sees a changed note', () => {
    assert.equal(sameCard(toCardModel(item, null), toCardModel({ ...item, siteName: 'Pinterest' }, null)), false);
  });
});
