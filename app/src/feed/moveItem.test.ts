/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMoveItem, type MoveItemPorts } from './moveItem.ts';

function setup(overrides: Partial<MoveItemPorts> = {}) {
  const calls: string[] = [];
  const ports: MoveItemPorts = {
    file: (id, collectionId) => calls.push(`file ${id} ${collectionId}`),
    tick: () => calls.push('tick'),
    warn: (message) => calls.push(`warn ${message}`),
    tellUser: () => calls.push('tell'),
    ...overrides,
  };
  return { calls, moveItem: createMoveItem(ports) };
}

describe('moveItem', () => {
  it('files the item, then ticks', () => {
    const { calls, moveItem } = setup();
    moveItem({ id: 'i1', from: 'c1', to: 'c2' });
    assert.deepEqual(calls, ['file i1 c2', 'tick']);
  });

  it('un-files to the Inbox', () => {
    const { calls, moveItem } = setup();
    moveItem({ id: 'i1', from: 'c1', to: null });
    assert.deepEqual(calls, ['file i1 null', 'tick']);
  });

  it('does nothing when the item already hangs there', () => {
    const { calls, moveItem } = setup();
    moveItem({ id: 'i1', from: 'c1', to: 'c1' });
    assert.deepEqual(calls, []);
  });

  it('warns and does not tick when filing fails', () => {
    const { calls, moveItem } = setup({
      file: () => {
        throw new Error('collection c9 not found');
      },
    });
    moveItem({ id: 'i1', from: 'c1', to: 'c9' });
    assert.deepEqual(calls, ['warn Could not move an item: collection c9 not found', 'tell']);
  });
});
