/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampRatio, MAX_RATIO, MIN_RATIO, postWords, sameCard, toCardModel } from './cardModel.ts';
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

  it('carries the original image, for zooming past the thumbnail (#60)', () => {
    const card = toCardModel(ready({ kind: 'image', imageUrl: 'https://example.com/full.png' }), THUMB, CARD_NOW);
    assert.equal(card.original, 'https://example.com/full.png');
  });

  it('has no original when the server found no image', () => {
    assert.equal(toCardModel(ready({ kind: 'image', imageUrl: null }), THUMB, CARD_NOW).original, null);
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

  it('names an undated post by its site, never its handle (#59)', () => {
    assert.equal(toCardModel(ready({ kind: 'post', post: { handle: 'jack', text: 'hi' } }), null, CARD_NOW).note, 'post · Aeon');
  });

  it('notes an image and a link by site', () => {
    assert.equal(toCardModel(ready({ kind: 'image' }), null, CARD_NOW).note, 'image · Aeon');
    assert.equal(toCardModel(ready({ kind: 'link' }), null, CARD_NOW).note, 'Aeon');
  });
});

describe('toCardModel: content', () => {
  it('folds X’s “math bold” letters back into plain ones, so the face sets them and TalkBack reads words (#59)', () => {
    const card = toCardModel(ready({ kind: 'post', post: { text: 'like an \u{1D65E}\u{1D663}\u{1D669}ern ✓' } }), null, CARD_NOW);
    assert.equal(card.postText, 'like an intern ✓');
  });

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

describe('toCardModel: posts show who said it (#58)', () => {
  const NOW = new Date('2026-11-16T09:00:00');
  const post = (fields: Record<string, unknown>) => ready({ kind: 'post', title: 'The engine might compose music', post: { handle: 'ada', text: 'The engine might compose music', ...fields } });

  it('names the author, else the handle, else nobody', () => {
    const bylines = [{ author: 'Ada Lovelace' }, {}, { handle: null }].map((fields) => toCardModel(post(fields), null, NOW).byline);
    assert.deepEqual(bylines, ['Ada Lovelace', '@ada', null]);
  });

  it('dates the note from when it was posted, with the year once it is not this one', () => {
    const notes = ['2026-11-03T10:00:00', '2025-12-24T10:00:00'].map((posted_at) => toCardModel(post({ posted_at }), null, NOW).note);
    assert.deepEqual(notes, ['post · 3 Nov', 'post · 24 Dec 2025']);
  });

  it('falls back to the site without a usable posted date: the handle signs the words instead (#59)', () => {
    const notes = [undefined, 'not a date'].map((posted_at) => toCardModel(post({ posted_at }), null, NOW).note);
    assert.deepEqual(notes, ['post · Aeon', 'post · Aeon']);
  });

  it('keeps the author and the handle apart for the imprint (#59)', () => {
    const card = toCardModel(post({ author: 'Ada Lovelace' }), null, NOW);
    assert.deepEqual([card.author, card.handle], ['Ada Lovelace', '@ada']);
  });

  it('has neither author nor handle when the server gave none', () => {
    const card = toCardModel(post({ handle: null }), null, NOW);
    assert.deepEqual([card.author, card.handle], [null, null]);
  });

  it('says the author and the words in its label', () => {
    const card = toCardModel(post({ author: 'Ada Lovelace', posted_at: '2026-11-03T10:00:00' }), null, NOW);
    assert.equal(card.accessibilityLabel, 'post, Ada Lovelace, The engine might compose music, post · 3 Nov');
  });

  it('says the handle when there is no author', () => {
    assert.equal(toCardModel(post({}), null, NOW).accessibilityLabel, 'post, @ada, The engine might compose music, post · Aeon');
  });

  it('leaves the byline off cards that are not posts', () => {
    assert.equal(toCardModel(ready({ kind: 'article', post: { author: 'Ada' } }), null, NOW).byline, null);
  });
});

describe('toCardModel: videos name their channel (#108)', () => {
  const video = (overrides: Parameters<typeof anItem>[0] = {}) => ready({ kind: 'video', siteName: 'YouTube', author: 'Veritasium', ...overrides });

  it('carries the channel the server found', () => {
    assert.equal(toCardModel(video(), null, CARD_NOW).channel, 'Veritasium');
  });

  it('has no channel when the server found none, or on other kinds', () => {
    const channels = [video({ author: null }), ready({ kind: 'article', author: 'Ada' })].map((item) => toCardModel(item, null, CARD_NOW).channel);
    assert.deepEqual(channels, [null, null]);
  });

  it('says the channel in its label, after the kind', () => {
    assert.equal(toCardModel(video(), null, CARD_NOW).accessibilityLabel, 'video, Veritasium, On boredom, YouTube');
  });
});

describe('toCardModel: a post’s picture that never came (#110)', () => {
  const NOW = new Date('2026-11-12T10:05:00.000Z');
  const LONG_AGO = '2026-11-12T10:02:00.000Z';
  const JUST_NOW = '2026-11-12T10:04:30.000Z';
  const post = (overrides: Parameters<typeof anItem>[0] = {}) =>
    ready({ kind: 'post', updatedAt: LONG_AGO, post: { handle: 'alex', text: 'Here’s mine:', media: ['https://pbs.test/p.jpg'] }, ...overrides });

  it('says so when the post listed a picture and no thumbnail came', () => {
    assert.equal(toCardModel(post(), null, NOW).pictureLost, true);
  });

  it('says nothing once the thumbnail is there, or while it may still come', () => {
    const lost = [post({ thumbW: 100, thumbH: 100 }), post({ imageUrl: 'https://pbs.test/p.jpg', updatedAt: JUST_NOW })].map((item) => toCardModel(item, THUMB, NOW).pictureLost);
    assert.deepEqual(lost, [false, false]);
  });

  it('says nothing for a post that had no picture, or for other kinds', () => {
    const lost = [post({ post: { handle: 'alex', text: 'Hi', media: [] } }), ready({ kind: 'article', post: { media: ['https://pbs.test/p.jpg'] } })].map((item) => toCardModel(item, null, NOW).pictureLost);
    assert.deepEqual(lost, [false, false]);
  });
});

describe('toCardModel: link descriptions (#58)', () => {
  it('carries the page description for the wall label', () => {
    assert.equal(toCardModel(ready({ kind: 'link', description: 'Why we drift' }), null, CARD_NOW).description, 'Why we drift');
  });

  it('has none for links saved before descriptions were kept', () => {
    assert.equal(toCardModel(ready({ kind: 'link' }), null, CARD_NOW).description, null);
  });

  it('leaves the description out of the label: the feed page reads it', () => {
    assert.equal(toCardModel(ready({ kind: 'link', description: 'Why we drift' }), null, CARD_NOW).accessibilityLabel, 'link, On boredom, Aeon');
  });
});

describe('postWords', () => {
  const PICTURE = 'file:///thumbs/p.webp';
  const card = (fields: Record<string, unknown>, thumb: string | null) =>
    toCardModel(ready({ kind: 'post', title: null, post: { author: 'Ada', ...fields }, thumbW: thumb ? 100 : null, thumbH: thumb ? 100 : null }), thumb, CARD_NOW);

  it('is the post text when there is some', () => {
    assert.equal(postWords(card({ text: 'hello' }, PICTURE)), 'hello');
  });

  it('is nothing for a picture-only post: the name and the picture fill the print', () => {
    assert.equal(postWords(card({ text: '' }, PICTURE)), null);
  });

  it('falls back to the site for a post with neither words nor picture', () => {
    assert.equal(postWords(card({ text: '' }, null)), 'Aeon');
  });

  it('falls back to the site for a picture-only post with no name, so the rules are never empty', () => {
    assert.equal(postWords(card({ text: '', author: null }, PICTURE)), 'Aeon');
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

  it('sees a byline arriving', () => {
    const post = ready({ kind: 'post', post: { handle: 'ada' } });
    assert.equal(sameCard(toCardModel(post, null, CARD_NOW), toCardModel({ ...post, post: { handle: 'ada', author: 'Ada' } }, null, CARD_NOW)), false);
  });

  it('sees a channel arriving', () => {
    const video = ready({ kind: 'video' });
    assert.equal(sameCard(toCardModel(video, null, CARD_NOW), toCardModel({ ...video, author: 'Veritasium' }, null, CARD_NOW)), false);
  });

  it('sees a description arriving', () => {
    const link = ready({ kind: 'link' });
    assert.equal(sameCard(toCardModel(link, null, CARD_NOW), toCardModel({ ...link, description: 'Why we drift' }, null, CARD_NOW)), false);
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
