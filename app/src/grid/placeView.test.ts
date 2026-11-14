/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { toCardModel, type CardModel } from './cardModel.ts';
import { settledChoice, toggledShuffle, viewOf } from './placeView.ts';
import { shuffleOrder } from './shuffleOrder.ts';
import { anItem, CARD_NOW } from './testing/anItem.ts';
import type { ItemKind } from '../db/schema.ts';

const ready = (id: string, kind: ItemKind): CardModel => toCardModel(anItem({ id, status: 'ready', kind }), null, CARD_NOW);
const ids = (cards: readonly CardModel[]) => cards.map(({ id }) => id);
const wall = [ready('a', 'video'), ready('b', 'article'), ready('c', 'video'), ready('d', 'article'), ready('e', 'video')];
const UNSHUFFLED = { filter: 'all', seed: null } as const;

describe('viewOf', () => {
  it('shows everything newest first with chips and Shuffle when nothing is chosen', () => {
    const view = viewOf(wall, UNSHUFFLED);
    assert.deepEqual([ids(view.cards), view.count, view.kinds], [['a', 'b', 'c', 'd', 'e'], '5 things', ['article', 'video']]);
  });

  it('filters, then orders by the seed', () => {
    const view = viewOf(wall, { filter: 'video', seed: 3 });
    assert.deepEqual([ids(view.cards), view.count], [ids(shuffleOrder(wall, 3)).filter((id) => ['a', 'c', 'e'].includes(id)), '3 videos']);
  });

  it('falls back to all when the chosen kind has gone', () => {
    const view = viewOf(wall.filter(({ id }) => id !== 'b' && id !== 'd'), { filter: 'article', seed: null });
    assert.deepEqual([view.filter, view.count, view.kinds], ['all', '3 things', ['video']]);
  });

  it('offers Shuffle only for two or more cards', () => {
    assert.deepEqual([viewOf(wall.slice(0, 1), UNSHUFFLED).canShuffle, viewOf(wall.slice(0, 2), UNSHUFFLED).canShuffle], [false, true]);
  });

  it('counts only the cards on the wall for Shuffle', () => {
    const oneArticle = wall.filter(({ id }) => id !== 'd');
    assert.equal(viewOf(oneArticle, { filter: 'article', seed: null }).canShuffle, false);
  });

  it('has no count on an empty wall', () => {
    assert.equal(viewOf([], UNSHUFFLED).count, null);
  });
});

describe('settledChoice', () => {
  it('keeps a filter that still applies', () => {
    const choice = { filter: 'video', seed: 3 } as const;
    assert.equal(settledChoice(choice, viewOf(wall, choice)), choice);
  });

  it('makes the fallback to all stick, keeping the seed', () => {
    const choice = { filter: 'article', seed: 3 } as const;
    const videosOnly = wall.filter(({ id }) => id !== 'b' && id !== 'd');
    assert.deepEqual(settledChoice(choice, viewOf(videosOnly, choice)), { filter: 'all', seed: 3 });
  });
});

describe('toggledShuffle', () => {
  it('deals a fresh seed when turned on', () => {
    assert.deepEqual(toggledShuffle({ filter: 'video', seed: null }, () => 9), { filter: 'video', seed: 9 });
  });

  it('goes back to newest first when turned off', () => {
    assert.deepEqual(toggledShuffle({ filter: 'video', seed: 9 }, () => 1), { filter: 'video', seed: null });
  });
});
