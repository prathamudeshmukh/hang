/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toCardModel, type CardModel } from './cardModel.ts';
import { chipLabel, filterCards, kindCount, kindsIn, selectedOrAll } from './kindFilter.ts';
import { anItem, CARD_NOW } from './testing/anItem.ts';
import type { ItemKind } from '../db/schema.ts';

const ready = (id: string, kind: ItemKind): CardModel => toCardModel(anItem({ id, status: 'ready', kind }), null, CARD_NOW);
const pending = (id: string): CardModel => toCardModel(anItem({ id, status: 'pending' }), null, CARD_NOW);
const failed = (id: string): CardModel => toCardModel(anItem({ id, status: 'failed' }), null, CARD_NOW);
const ids = (cards: readonly CardModel[]) => cards.map(({ id }) => id);

describe('kindsIn', () => {
  it('lists the kinds present in chip order, once each', () => {
    const cards = [ready('a', 'video'), ready('b', 'article'), ready('c', 'video'), ready('d', 'link')];
    assert.deepEqual(kindsIn(cards), ['article', 'video', 'link']);
  });

  it('skips pending cards, which have no kind yet', () => {
    assert.deepEqual(kindsIn([pending('a'), ready('b', 'post')]), ['post']);
  });

  it('counts a failed card as a link', () => {
    assert.deepEqual(kindsIn([failed('a')]), ['link']);
  });
});

describe('filterCards', () => {
  const cards = [ready('a', 'video'), pending('b'), failed('c'), ready('d', 'link'), ready('e', 'video')];

  it('keeps every card, pending too, under all', () => {
    assert.deepEqual(ids(filterCards(cards, 'all')), ['a', 'b', 'c', 'd', 'e']);
  });

  it('keeps only one kind, in order', () => {
    assert.deepEqual(ids(filterCards(cards, 'video')), ['a', 'e']);
  });

  it('puts failed cards under links and never shows pending ones', () => {
    assert.deepEqual(ids(filterCards(cards, 'link')), ['c', 'd']);
  });
});

describe('selectedOrAll', () => {
  it('keeps a kind the place still has', () => {
    assert.equal(selectedOrAll('video', ['article', 'video']), 'video');
  });

  it('falls back to all when the kind has gone', () => {
    assert.equal(selectedOrAll('video', ['article', 'link']), 'all');
  });

  it('falls back to all when the chips are hidden (one kind left)', () => {
    assert.equal(selectedOrAll('video', ['video']), 'all');
  });
});

describe('kindCount', () => {
  it('counts things under all', () => {
    assert.deepEqual([kindCount('all', 1), kindCount('all', 23)], ['1 thing', '23 things']);
  });

  it('names the kind, singular and plural', () => {
    assert.deepEqual([kindCount('video', 1), kindCount('video', 4)], ['1 video', '4 videos']);
  });

  it('names every kind', () => {
    const notes = (['article', 'post', 'image', 'link'] as const).map((kind) => kindCount(kind, 2));
    assert.deepEqual(notes, ['2 articles', '2 posts', '2 images', '2 links']);
  });
});

describe('chipLabel', () => {
  it('labels all and each kind as signage', () => {
    assert.deepEqual([chipLabel('all'), chipLabel('article'), chipLabel('link')], ['All', 'Articles', 'Links']);
  });
});
