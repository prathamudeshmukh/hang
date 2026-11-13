/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFeedSessions, startIndex } from './feedSession.ts';

function setup() {
  let next = 0;
  return createFeedSessions(() => `t${++next}`);
}

describe('feed sessions', () => {
  it('hands the list and the start to the feed route', () => {
    const sessions = setup();
    const token = sessions.begin({ ids: ['a', 'b', 'c'], start: 'b' });
    assert.deepEqual(sessions.read(token, 'b'), { ids: ['a', 'b', 'c'], start: 'b' });
  });

  it('falls back to the start item alone when the session is gone (the process was restarted)', () => {
    const sessions = setup();
    assert.deepEqual(sessions.read('t9', 'b'), { ids: ['b'], start: 'b' });
  });

  it('keeps only the latest session', () => {
    const sessions = setup();
    const first = sessions.begin({ ids: ['a', 'b'], start: 'a' });
    sessions.begin({ ids: ['c'], start: 'c' });
    assert.deepEqual(sessions.read(first, 'a'), { ids: ['a'], start: 'a' });
  });

  it('opens on the start item alone when it is not in the list', () => {
    const sessions = setup();
    const token = sessions.begin({ ids: ['a', 'b'], start: 'z' });
    assert.deepEqual(sessions.read(token, 'z'), { ids: ['z'], start: 'z' });
  });
});

describe('startIndex', () => {
  it('finds the start in the list', () => {
    assert.equal(startIndex({ ids: ['a', 'b', 'c'], start: 'c' }), 2);
  });
});
