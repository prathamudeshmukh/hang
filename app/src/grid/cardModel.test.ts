/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampRatio, MAX_RATIO, MIN_RATIO, sameCard, toCardModel } from './cardModel.ts';
import { anItem, CARD_NOW } from './testing/anItem.ts';

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
    const card = toCardModel(anItem({ status: 'extracting', thumbW: 100, thumbH: 100 }), THUMB, CARD_NOW);
    assert.deepEqual([card.variant, card.note, card.media], ['pending', 'fetching…', null]);
  });

  it('shows a failed item like a link, with what was found', () => {
    const card = toCardModel(anItem({ status: 'failed', sharedTitle: 'Shared title' }), null, CARD_NOW);
    assert.deepEqual([card.variant, card.title, card.note], ['failed', 'Shared title', 'couldn’t read this']);
  });

  it('treats a ready item with no kind as a link', () => {
    assert.equal(toCardModel(ready({ kind: null }), null, CARD_NOW).variant, 'link');
  });
});

describe('toCardModel: media', () => {
  it('holds the box at the clamped ratio before the file is on the device', () => {
    const card = toCardModel(ready({ kind: 'article', thumbW: 1000, thumbH: 500 }), null, CARD_NOW);
    assert.deepEqual(card.media, { ratio: 0.5, naturalRatio: 0.5, uri: null });
  });

  it('carries the downloaded file', () => {
    const card = toCardModel(ready({ kind: 'image', thumbW: 800, thumbH: 1000 }), THUMB, CARD_NOW);
    assert.deepEqual(card.media, { ratio: 1.25, naturalRatio: 1.25, uri: THUMB });
  });

  it('keeps the unclamped ratio, so a whole image can be fitted in the feed (#32)', () => {
    const card = toCardModel(ready({ kind: 'image', thumbW: 400, thumbH: 1200 }), THUMB, CARD_NOW);
    assert.deepEqual(card.media, { ratio: 1.6, naturalRatio: 3, uri: THUMB });
  });

  it('has no media without a thumbnail size, so it becomes a text card', () => {
    assert.equal(toCardModel(ready({ kind: 'article' }), THUMB, CARD_NOW).media, null);
  });
});

describe('toCardModel: notes', () => {
  it('gives an article its reading time and site', () => {
    assert.equal(toCardModel(ready({ kind: 'article', readingMin: 9 }), null, CARD_NOW).note, '9 min · Aeon');
  });

  it('falls back to the host when there is no site name', () => {
    assert.equal(toCardModel(ready({ kind: 'article', siteName: null }), null, CARD_NOW).note, 'aeon.co');
  });

  it('gives an inline video its duration and site', () => {
    const card = toCardModel(ready({ kind: 'video', siteName: 'YouTube', durationS: 840, embed: { provider: 'youtube', playable_inline: true } }), null, CARD_NOW);
    assert.equal(card.note, '14 min · YouTube');
  });

  it('says a video that plays elsewhere opens in its app', () => {
    const card = toCardModel(ready({ kind: 'video', siteName: 'TikTok', embed: { provider: 'tiktok', playable_inline: false } }), null, CARD_NOW);
    assert.equal(card.note, 'opens in TikTok');
  });

  it('names a post by its handle, or its site without one', () => {
    assert.equal(toCardModel(ready({ kind: 'post', post: { handle: 'jack', text: 'hi' } }), null, CARD_NOW).note, 'post · @jack');
    assert.equal(toCardModel(ready({ kind: 'post', post: { handle: 42 } }), null, CARD_NOW).note, 'post · Aeon');
  });

  it('notes an image and a link by site', () => {
    assert.equal(toCardModel(ready({ kind: 'image' }), null, CARD_NOW).note, 'image · Aeon');
    assert.equal(toCardModel(ready({ kind: 'link' }), null, CARD_NOW).note, 'Aeon');
  });
});

describe('toCardModel: content', () => {
  it('takes the post text only when it is text', () => {
    assert.equal(toCardModel(ready({ kind: 'post', post: { text: 'just setting up' } }), null, CARD_NOW).postText, 'just setting up');
    assert.equal(toCardModel(ready({ kind: 'post', post: { text: ['no'] } }), null, CARD_NOW).postText, null);
  });

  it('prefers the extracted title, then the shared one', () => {
    assert.equal(toCardModel(anItem({ status: 'ready', title: null, sharedTitle: 'Shared' }), null, CARD_NOW).title, 'Shared');
    assert.equal(toCardModel(anItem({ status: 'ready' }), null, CARD_NOW).title, null);
  });

  it('describes the card as kind, title, note', () => {
    const card = toCardModel(ready({ kind: 'article', readingMin: 9 }), null, CARD_NOW);
    assert.equal(card.accessibilityLabel, 'article, On boredom, 9 min · Aeon');
  });

  it('describes a pending card without guessing its kind', () => {
    const card = toCardModel(anItem({ status: 'pending' }), null, CARD_NOW);
    assert.equal(card.accessibilityLabel, 'aeon.co, fetching…');
  });

  it('does not repeat the site when an untitled card already notes it', () => {
    const card = toCardModel(ready({ kind: 'link', title: null }), null, CARD_NOW);
    assert.equal(card.accessibilityLabel, 'link, Aeon');
  });
});

describe('sameCard', () => {
  const item = ready({ kind: 'image', thumbW: 100, thumbH: 100 });

  it('treats a rebuilt card with the same content as the same', () => {
    assert.equal(sameCard(toCardModel(item, THUMB, CARD_NOW), toCardModel(item, THUMB, CARD_NOW)), true);
  });

  it('sees a thumbnail landing', () => {
    assert.equal(sameCard(toCardModel(item, null, CARD_NOW), toCardModel(item, THUMB, CARD_NOW)), false);
  });

  it('sees a changed note', () => {
    assert.equal(sameCard(toCardModel(item, null, CARD_NOW), toCardModel({ ...item, siteName: 'Pinterest' }, null, CARD_NOW)), false);
  });
});

describe('toCardModel: waiting for the image (#34)', () => {
  const NOW = new Date('2026-11-12T10:05:00.000Z');
  const JUST_NOW = '2026-11-12T10:04:30.000Z';
  const LONG_AGO = '2026-11-12T10:02:00.000Z';
  const waiting = (overrides: Parameters<typeof anItem>[0] = {}) =>
    ready({ kind: 'article', imageUrl: 'https://cdn.test/lead.jpg', updatedAt: JUST_NOW, ...overrides });

  it('holds a placeholder box while an image is on its way', () => {
    const card = toCardModel(waiting(), null, NOW);
    assert.deepEqual(card.media, { ratio: 1.25, naturalRatio: 1.25, uri: null });
  });

  it('stops waiting two minutes after the last server change and draws a text card', () => {
    assert.equal(toCardModel(waiting({ updatedAt: LONG_AGO }), null, NOW).media, null);
  });

  it('has nothing to wait for without an image address', () => {
    assert.equal(toCardModel(waiting({ imageUrl: null }), null, NOW).media, null);
  });
});
