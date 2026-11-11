/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isOnline } from './networkState.ts';

describe('isOnline', () => {
  it('is online when connected and the internet is reachable or not yet known', () => {
    assert.equal(isOnline({ isConnected: true, isInternetReachable: true }), true);
    assert.equal(isOnline({ isConnected: true, isInternetReachable: null }), true);
  });

  it('is offline when disconnected, unknown, or connected without internet', () => {
    assert.equal(isOnline({ isConnected: false, isInternetReachable: null }), false);
    assert.equal(isOnline({ isConnected: null, isInternetReachable: null }), false);
    assert.equal(isOnline({ isConnected: true, isInternetReachable: false }), false);
  });
});
