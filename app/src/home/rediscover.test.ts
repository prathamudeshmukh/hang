/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { anItem } from '../grid/testing/anItem.ts';
import { pickRediscover, rediscoverWindow } from './rediscover.ts';

const TODAY = new Date(2026, 10, 12, 9);
const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (days: number) => new Date(TODAY.getTime() - days * DAY_MS).toISOString();
const old = (id: string, overrides = {}) => anItem({ id, createdAt: daysAgo(90), ...overrides });

describe('pickRediscover', () => {
  it('is null when nothing qualifies', () => {
    assert.equal(pickRediscover([], TODAY), null);
  });

  it('skips items saved in the last 30 days', () => {
    assert.equal(pickRediscover([anItem({ id: 'a', createdAt: daysAgo(29) })], TODAY), null);
  });

  it('skips items opened in the last 30 days', () => {
    assert.equal(pickRediscover([old('a', { lastOpenedAt: daysAgo(10) })], TODAY), null);
  });

  it('skips items rediscovered in the last 60 days', () => {
    assert.equal(pickRediscover([old('a', { rediscoveredOn: '2026-10-01' })], TODAY), null);
  });

  it('allows items opened or rediscovered long enough ago', () => {
    const item = old('a', { lastOpenedAt: daysAgo(31), rediscoveredOn: '2026-08-01' });
    assert.equal(pickRediscover([item], TODAY)?.id, 'a');
  });

  it('prefers unread items', () => {
    const items = [old('read', { readAt: daysAgo(80) }), old('unread')];
    assert.equal(pickRediscover(items, TODAY)?.id, 'unread');
  });

  it('falls back to read items', () => {
    assert.equal(pickRediscover([old('read', { readAt: daysAgo(80) })], TODAY)?.id, 'read');
  });

  it('gives the same pick for the same day, whatever the order', () => {
    const items = ['a', 'b', 'c', 'd', 'e'].map((id) => old(id));
    assert.equal(pickRediscover(items, TODAY)?.id, pickRediscover([...items].reverse(), TODAY)?.id);
  });

  it('can give a different pick on another day', () => {
    const items = Array.from({ length: 20 }, (_, n) => old(`i${n}`));
    const picks = new Set(Array.from({ length: 10 }, (_, n) => pickRediscover(items, new Date(2026, 10, 12 + n, 9))?.id));
    assert.ok(picks.size > 1);
  });

  it('keeps the item already stamped today, even once opened', () => {
    const stamped = old('stamped', { rediscoveredOn: '2026-11-12', lastOpenedAt: daysAgo(0) });
    assert.equal(pickRediscover([old('a'), old('b'), stamped], TODAY)?.id, 'stamped');
  });

  it('settles on one pick when two items carry today\'s stamp', () => {
    const items = [old('a', { rediscoveredOn: '2026-11-12' }), old('b', { rediscoveredOn: '2026-11-12' })];
    assert.equal(pickRediscover(items, TODAY)?.id, pickRediscover([...items].reverse(), TODAY)?.id);
  });

  it('compares server timestamps by time, not by text', () => {
    const openedYesterday = old('a', { lastOpenedAt: '2026-11-11T09:00:00.123456+00:00' });
    assert.equal(pickRediscover([openedYesterday], TODAY), null);
  });
});

describe('rediscoverWindow', () => {
  it('counts calendar days, so a clock change never shifts the day', () => {
    const window = rediscoverWindow(TODAY);
    assert.deepEqual(
      [window.savedBefore, window.openedBefore, window.rediscoveredBefore, window.today],
      [new Date(2026, 9, 13, 9).toISOString(), new Date(2026, 9, 13, 9).toISOString(), '2026-09-13', '2026-11-12'],
    );
  });
});
