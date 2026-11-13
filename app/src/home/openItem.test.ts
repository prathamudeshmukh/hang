/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOpenItem, type OpenItemPorts } from './openItem.ts';

const CARD = { id: 'i1', url: 'https://aeon.co/essays/on-boredom' };

function setup(overrides: Partial<OpenItemPorts> = {}) {
  const calls: string[] = [];
  const ports: OpenItemPorts = {
    markOpened: (id) => calls.push(`mark ${id}`),
    openUrl: async (url) => {
      calls.push(`open ${url}`);
    },
    warn: (message) => calls.push(`warn ${message}`),
    ...overrides,
  };
  return { calls, openItem: createOpenItem(ports) };
}

describe('openItem', () => {
  it('records the open before opening the link', async () => {
    const { calls, openItem } = setup();
    await openItem(CARD);
    assert.deepEqual(calls, ['mark i1', `open ${CARD.url}`]);
  });

  it('still opens the link when recording fails, and says so without the URL', async () => {
    const { calls, openItem } = setup({
      markOpened: () => {
        throw new Error('item i1 not found');
      },
    });
    await openItem(CARD);
    assert.deepEqual(calls, ['warn Could not record an open: item i1 not found', `open ${CARD.url}`]);
  });
});
