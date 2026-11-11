/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createItemsRealtime, ITEMS_CHANGES, type RealtimeClient } from './realtimeItems.ts';

function fakeClient() {
  const state = {
    filter: null as unknown,
    onEvent: null as (() => void) | null,
    onStatus: null as ((status: string, error?: Error) => void) | null,
    removed: 0,
    topics: [] as string[],
    failRemove: false,
  };
  const channel = {
    on(_type: 'postgres_changes', filter: unknown, callback: () => void) {
      state.filter = filter;
      state.onEvent = callback;
      return channel;
    },
    subscribe(callback: (status: string, error?: Error) => void) {
      state.onStatus = callback;
      return channel;
    },
  };
  const client: RealtimeClient = {
    channel: (topic: string) => {
      state.topics.push(topic);
      return channel;
    },
    removeChannel: async () => {
      state.removed += 1;
      if (state.failRemove) throw new Error('socket gone');
      return 'ok';
    },
  };
  return { client, state };
}

describe('items Realtime port', () => {
  let fake: ReturnType<typeof fakeClient>;
  let seen: string[];
  let logs: string[];
  let close: () => void;
  let port: ReturnType<typeof createItemsRealtime>;
  beforeEach(() => {
    fake = fakeClient();
    seen = [];
    logs = [];
    port = createItemsRealtime({ client: fake.client, log: (message) => logs.push(message) });
    close = port.subscribe({
      onChange: () => seen.push('change'),
      onError: (reason) => seen.push(reason),
    });
  });

  it('listens to every change on public.items and passes it on as a bare signal', () => {
    fake.state.onEvent?.();
    assert.deepEqual(fake.state.filter, ITEMS_CHANGES);
    assert.deepEqual(seen, ['change']);
  });

  it('reports a channel error or timeout with its reason', () => {
    fake.state.onStatus?.('CHANNEL_ERROR', new Error('jwt expired'));
    fake.state.onStatus?.('TIMED_OUT');
    assert.deepEqual(seen, ['CHANNEL_ERROR (jwt expired)', 'TIMED_OUT']);
  });

  it('ignores the normal statuses and removes the channel when closed', () => {
    fake.state.onStatus?.('SUBSCRIBED');
    fake.state.onStatus?.('CLOSED');
    close();
    assert.deepEqual(seen, []);
    assert.equal(fake.state.removed, 1);
  });

  it('ignores events and statuses that arrive after it was closed', () => {
    close();
    fake.state.onEvent?.();
    fake.state.onStatus?.('CHANNEL_ERROR');
    assert.deepEqual(seen, []);
  });

  it('opens each subscription on its own topic, so a channel still leaving is never reused', () => {
    port.subscribe({ onChange: () => {}, onError: () => {} });
    assert.equal(new Set(fake.state.topics).size, 2);
  });

  it('logs a failed removal instead of leaving it unhandled', async () => {
    fake.state.failRemove = true;
    close();
    await new Promise((resolve) => setImmediate(resolve));
    assert.match(logs[0], /socket gone/);
  });
});
