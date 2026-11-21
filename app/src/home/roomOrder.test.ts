/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { roomOrder } from './roomOrder.ts';

const room = (id: string, newestAt: string | null) => ({ id, newestAt });

describe('roomOrder (#106)', () => {
  it('puts the room that got the newest item first', () => {
    const rooms = [room('old', '2026-11-01T00:00:00.000Z'), room('fresh', '2026-11-20T00:00:00.000Z'), room('mid', '2026-11-10T00:00:00.000Z')];
    assert.deepEqual(roomOrder(rooms).map(({ id }) => id), ['fresh', 'mid', 'old']);
  });

  it('sinks empty rooms to the end, keeping the order they were made in', () => {
    const rooms = [room('emptyA', null), room('full', '2026-11-01T00:00:00.000Z'), room('emptyB', null)];
    assert.deepEqual(roomOrder(rooms).map(({ id }) => id), ['full', 'emptyA', 'emptyB']);
  });

  it('keeps the order rooms were made in when their newest items tie', () => {
    const rooms = [room('first', '2026-11-01T00:00:00.000Z'), room('second', '2026-11-01T00:00:00.000Z')];
    assert.deepEqual(roomOrder(rooms).map(({ id }) => id), ['first', 'second']);
  });

  it('leaves the given list as it was', () => {
    const rooms = [room('old', '2026-11-01T00:00:00.000Z'), room('fresh', '2026-11-20T00:00:00.000Z')];
    roomOrder(rooms);
    assert.deepEqual(rooms.map(({ id }) => id), ['old', 'fresh']);
  });
});
