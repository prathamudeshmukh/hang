/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Item } from '../db/schema.ts';
import { toCardModel } from '../grid/cardModel.ts';
import { anItem, CARD_NOW } from '../grid/testing/anItem.ts';
import { samePage, toFeedPage, type FeedPageExtras } from './feedPage.ts';

const WITH_THUMB = { thumbW: 800, thumbH: 600 } as const;
const UNMOVED: FeedPageExtras = { summary: null, placeId: null };
const pageOf = (overrides: Partial<Item>, extras = UNMOVED) => toFeedPage(toCardModel(anItem(overrides), 'file:///thumb.jpg', CARD_NOW), extras);

describe('toFeedPage media', () => {
  it('fits an image whole, never cropped', () => {
    const { media } = pageOf({ status: 'ready', kind: 'image', ...WITH_THUMB });
    assert.deepEqual([media.kind, media.kind === 'picture' && media.fit], ['picture', 'contain']);
  });

  it('crops a video thumbnail to fill and marks it playable', () => {
    const { media } = pageOf({ status: 'ready', kind: 'video', ...WITH_THUMB });
    assert.deepEqual(media.kind === 'picture' && [media.fit, media.playable], ['cover', true]);
  });

  it('sets the title large in the media area when there is no thumbnail, and not again below', () => {
    const page = pageOf({ status: 'ready', kind: 'article', title: 'On boredom' });
    assert.deepEqual([page.media.kind, page.showTitle], ['title', false]);
  });

  it('sets a post as the whole page, with no title below (#59)', () => {
    const page = pageOf({ status: 'ready', kind: 'post', post: { text: 'A thread' } });
    assert.deepEqual([page.media.kind, page.showTitle], ['post', false]);
  });

  it('shows a fetching item as pending, with its shared title below', () => {
    const page = pageOf({ status: 'extracting', sharedTitle: 'On boredom' });
    assert.deepEqual([page.media.kind, page.showTitle, page.note], ['pending', true, 'fetching…']);
  });

  it('shows a failed read like a link, without a retry', () => {
    const page = pageOf({ status: 'failed', ...WITH_THUMB });
    assert.deepEqual([page.media.kind, page.note, page.action], ['picture', 'couldn’t read this', 'Open']);
  });
});

describe('samePage', () => {
  it('treats a page rebuilt from the same row as unchanged', () => {
    const fields = { status: 'ready', kind: 'article', title: 'On boredom' } as const;
    assert.equal(samePage(pageOf(fields), pageOf(fields)), true);
  });

  it('sees a move', () => {
    const fields = { status: 'ready', kind: 'article' } as const;
    assert.equal(samePage(pageOf(fields), pageOf(fields, { summary: null, movedTo: 'Recipes', placeId: 'c2' })), false);
  });
});

describe('toFeedPage text', () => {
  it('keeps the summary and the place it hangs in', () => {
    const page = pageOf({ status: 'ready', kind: 'article' }, { summary: 'Why we drift.', placeId: 'c1' });
    assert.deepEqual([page.summary, page.placeId], ['Why we drift.', 'c1']);
  });

  it('says where a moved item went instead of its catalogue note', () => {
    const page = pageOf({ status: 'ready', kind: 'article', readingMin: 9 }, { summary: null, movedTo: 'Recipes', placeId: 'c2' });
    assert.equal(page.note, 'moved to Recipes');
  });

  it('describes the page for TalkBack with the card’s label', () => {
    const page = pageOf({ status: 'ready', kind: 'article', title: 'On boredom', readingMin: 9 });
    assert.equal(page.accessibilityLabel, 'article, On boredom, 9 min · aeon.co');
  });
});

describe('toFeedPage link pages (#54)', () => {
  const LINK = { status: 'ready', kind: 'link', siteName: 'aeon.co' } as const;

  it('adds how long a link has hung to its note', () => {
    const page = pageOf(LINK, { ...UNMOVED, saved: 'saved 3 days ago' });
    assert.equal(page.note, 'aeon.co · saved 3 days ago');
  });

  it('gives a link’s description five lines and everything else two', () => {
    const lines = [pageOf(LINK).summaryLines, pageOf({ status: 'ready', kind: 'article' }).summaryLines];
    assert.deepEqual(lines, [5, 2]);
  });

  it('keeps other kinds’ notes as they are', () => {
    const page = pageOf({ status: 'ready', kind: 'article', readingMin: 9 }, { ...UNMOVED, saved: 'saved 3 days ago' });
    assert.equal(page.note, '9 min · aeon.co');
  });

  it('still says where a moved link went', () => {
    const page = pageOf(LINK, { summary: null, movedTo: 'Recipes', placeId: 'c2', saved: 'saved today' });
    assert.equal(page.note, 'moved to Recipes');
  });
});

describe('toFeedPage: a post page’s parts (#59)', () => {
  const postOf = (post: Record<string, unknown>, thumb: Partial<Item> = {}) => {
    const { media } = pageOf({ status: 'ready', kind: 'post', title: 'Ada on X', post: { handle: 'ada', ...post }, ...thumb });
    assert.ok(media.kind === 'post');
    return media;
  };

  it('has the words, the imprint and the picture that answers them', () => {
    const media = postOf({ text: 'A thread', author: 'Ada Lovelace' }, WITH_THUMB);
    assert.deepEqual([media.words, media.imprint, media.picture?.uri], ['A thread', { author: 'Ada Lovelace', handle: '@ada' }, 'file:///thumb.jpg']);
  });

  it('has no words for a picture-only post: the picture takes their place', () => {
    assert.deepEqual([postOf({ text: '' }, WITH_THUMB).words, postOf({ text: '' }, WITH_THUMB).picture !== null], [null, true]);
  });

  it('falls back to the title for a post with neither words nor picture, so the page is never empty', () => {
    assert.equal(postOf({ text: '' }).words, 'Ada on X');
  });

  it('keeps the title as words for a picture-only post nobody signs, as its print does', () => {
    assert.equal(postOf({ text: '', handle: null }, WITH_THUMB).words, 'Ada on X');
  });

  it('signs with the handle alone when there is no author', () => {
    assert.deepEqual(postOf({ text: 'hi' }).imprint, { author: null, handle: '@ada' });
  });

  it('has no imprint when the server knew neither author nor handle', () => {
    assert.equal(postOf({ text: 'hi', handle: null }).imprint, null);
  });
});
