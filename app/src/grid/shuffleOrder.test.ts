/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { newSeed, shuffleOrder } from './shuffleOrder.ts';

const card = (id: string) => ({ id });
const ids = (cards: readonly { readonly id: string }[]) => cards.map(({ id }) => id);
const deck = Array.from({ length: 30 }, (_, index) => card(`item-${index}`));

describe('shuffleOrder', () => {
  it('gives the same order for the same seed', () => {
    assert.deepEqual(ids(shuffleOrder(deck, 7)), ids(shuffleOrder(deck, 7)));
  });

  it('gives a different order for a different seed', () => {
    assert.notDeepEqual(ids(shuffleOrder(deck, 7)), ids(shuffleOrder(deck, 8)));
  });

  it('moves the cards away from newest first and keeps all of them', () => {
    const shuffled = ids(shuffleOrder(deck, 7));
    assert.notDeepEqual(shuffled, ids(deck));
    assert.deepEqual([...shuffled].sort(), ids(deck).sort());
  });

  it('keeps the others in place when a card arrives', () => {
    const before = ids(shuffleOrder(deck, 7));
    const after = ids(shuffleOrder([card('new'), ...deck], 7)).filter((id) => id !== 'new');
    assert.deepEqual(after, before);
  });

  it('keeps the relative order of a subset, so filters don’t reshuffle', () => {
    const subset = deck.filter((_, index) => index % 3 === 0);
    const expected = ids(shuffleOrder(deck, 7)).filter((id) => ids(subset).includes(id));
    assert.deepEqual(ids(shuffleOrder(subset, 7)), expected);
  });

  it('leaves the input untouched and handles an empty wall', () => {
    const input = deck.slice(0, 3);
    shuffleOrder(input, 7);
    assert.deepEqual([ids(input), shuffleOrder([], 7)], [['item-0', 'item-1', 'item-2'], []]);
  });
});

describe('newSeed', () => {
  it('turns a random number into a 32-bit seed', () => {
    assert.deepEqual([newSeed(() => 0), newSeed(() => 0.5)], [0, 2 ** 31]);
  });
});
