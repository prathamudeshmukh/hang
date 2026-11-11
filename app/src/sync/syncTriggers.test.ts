/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import { createSyncTriggers, SYNC_TRIGGER_TIMING } from './syncTriggers.ts';
import { createFakeTriggerWorld, settle, type FakeTriggerWorld } from './testing/fakeTriggerPorts.ts';

const { foregroundMinGapMs, realtimeDebounceMs } = SYNC_TRIGGER_TIMING;

function started(options: { readonly foreground?: boolean } = {}) {
  const world = createFakeTriggerWorld(options);
  const triggers = createSyncTriggers(world.ports);
  triggers.start();
  return { world, triggers };
}

describe('sync triggers: starting', () => {
  it('does not sync on start (sign-in just did) and listens to Realtime in the foreground', () => {
    const { world } = started();
    assert.deepEqual(world.calls, []);
    assert.equal(world.realtimeSubscribed, true);
  });

  it('does not open Realtime when started in the background', () => {
    const { world } = started({ foreground: false });
    assert.equal(world.realtimeSubscribed, false);
  });

  it('starting twice changes nothing', async () => {
    const { world, triggers } = started();
    triggers.start();
    world.goForeground(true);
    await world.advance(foregroundMinGapMs);
    assert.deepEqual(world.calls, []);
  });
});

describe('sync triggers: foreground', () => {
  let world: FakeTriggerWorld;
  beforeEach(() => {
    world = started().world;
  });

  it('syncs on return to the foreground once 30 s have passed', async () => {
    world.goForeground(false);
    await world.advance(foregroundMinGapMs);
    world.goForeground(true);
    await settle();
    assert.deepEqual(world.calls, ['sync']);
  });

  it('skips the sync when the last one was under 30 s ago', async () => {
    world.goForeground(false);
    await world.advance(foregroundMinGapMs - 1);
    world.goForeground(true);
    assert.deepEqual(world.calls, []);
  });

  it('closes Realtime in the background and reopens it in the foreground', () => {
    world.goForeground(false);
    const closed = !world.realtimeSubscribed;
    world.goForeground(true);
    assert.equal(closed, true);
    assert.equal(world.realtimeSubscribed, true);
  });
});

describe('sync triggers: Realtime', () => {
  let world: FakeTriggerWorld;
  beforeEach(() => {
    world = started().world;
  });

  it('turns a burst of changes into one sync after the debounce', async () => {
    world.realtimeChange();
    await world.advance(realtimeDebounceMs / 2);
    world.realtimeChange();
    await world.advance(realtimeDebounceMs);
    assert.deepEqual(world.calls, ['sync']);
  });

  it('opens a fresh channel on the next foreground after an error', () => {
    world.realtimeError('TIMED_OUT');
    world.goForeground(false);
    world.goForeground(true);
    assert.equal(world.realtimeSubscribed, true);
  });

  it('logs a channel error, closes the channel and leaves the rest to the other triggers', () => {
    world.realtimeError('CHANNEL_ERROR');
    assert.equal(world.realtimeSubscribed, false);
    assert.match(world.logs[0], /CHANNEL_ERROR/);
  });

  it('drops a pending change when the app leaves the foreground', async () => {
    world.realtimeChange();
    world.goForeground(false);
    await world.advance(realtimeDebounceMs);
    assert.deepEqual(world.calls, []);
  });
});

describe('sync triggers: connectivity', () => {
  let world: FakeTriggerWorld;
  beforeEach(() => {
    world = started().world;
  });

  it('clears the backoff and syncs when the connection comes back', async () => {
    world.setOnline(false);
    world.setOnline(true);
    await settle();
    assert.deepEqual(world.calls, ['retryNow', 'sync']);
  });

  it('reopens Realtime when the connection comes back after a channel error', () => {
    world.realtimeError('CHANNEL_ERROR');
    world.setOnline(false);
    world.setOnline(true);
    assert.equal(world.realtimeSubscribed, true);
  });

  it('does not open a second channel on reconnect while one is open', () => {
    world.setOnline(false);
    world.setOnline(true);
    assert.equal(world.realtimeOpens, 1);
  });

  it('does not sync on the first report or while staying online', async () => {
    world.setOnline(true);
    world.setOnline(true);
    await settle();
    assert.deepEqual(world.calls, []);
  });
});

describe('sync triggers: backoff timer', () => {
  let world: FakeTriggerWorld;
  beforeEach(() => {
    world = started().world;
  });

  it('syncs again when the head of the queue may be retried', async () => {
    world.retryAt(world.clock.now() + realtimeDebounceMs + 5000);
    world.realtimeChange();
    await world.advance(realtimeDebounceMs);
    world.retryAt(null);
    await world.advance(5000);
    assert.deepEqual(world.calls, ['sync', 'sync']);
  });

  it('does not wait for a retry in the background', async () => {
    world.retryAt(world.clock.now() + realtimeDebounceMs + 5000);
    world.realtimeChange();
    await world.advance(realtimeDebounceMs);
    world.goForeground(false);
    await world.advance(5000);
    assert.deepEqual(world.calls, ['sync']);
  });

  it('schedules the retry on return to the foreground, even without a sync then', async () => {
    world.goForeground(false);
    world.retryAt(world.clock.now() + 5000);
    world.goForeground(true);
    await world.advance(5000);
    assert.deepEqual(world.calls, ['sync']);
  });
});

describe('sync triggers: syncs in flight', () => {
  it('a sync that ends after stop schedules no retry', async () => {
    const { world, triggers } = started();
    const release = world.holdNextSync();
    const done = triggers.syncNow();
    triggers.stop();
    world.retryAt(world.clock.now() + 5000);
    release();
    await done;
    await world.advance(5000);
    assert.deepEqual(world.calls, ['sync']);
  });

  it('a sync that ends in the background schedules no retry', async () => {
    const { world, triggers } = started();
    const release = world.holdNextSync();
    const done = triggers.syncNow();
    world.goForeground(false);
    world.retryAt(world.clock.now() + 5000);
    release();
    await done;
    await world.advance(5000);
    assert.deepEqual(world.calls, ['sync']);
  });

  it('syncNow keeps the backoff (no retryNow)', async () => {
    const { world, triggers } = started();
    await triggers.syncNow();
    assert.deepEqual(world.calls, ['sync']);
  });

  it('stop then start listens again exactly once', () => {
    const { world, triggers } = started();
    triggers.stop();
    triggers.start();
    assert.equal(world.realtimeOpens, 2);
    assert.equal(world.realtimeSubscribed, true);
  });
});

describe('sync triggers: refresh and stop', () => {
  it('refresh clears the backoff and resolves once the sync is done', async () => {
    const { world, triggers } = started();
    await triggers.refresh();
    assert.deepEqual(world.calls, ['retryNow', 'sync']);
  });

  it('a sync that throws is logged, not raised', async () => {
    const { world, triggers } = started();
    world.failNextSync(new Error('boom'));
    await triggers.refresh();
    assert.match(world.logs[0], /boom/);
  });

  it('after stop, nothing fires and Realtime is closed', async () => {
    const { world, triggers } = started();
    world.realtimeChange();
    triggers.stop();
    world.setOnline(false);
    world.setOnline(true);
    await world.advance(foregroundMinGapMs);
    assert.deepEqual(world.calls, []);
    assert.equal(world.realtimeSubscribed, false);
  });
});
