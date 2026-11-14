/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { rediscoverEntry } from './rediscoverEntry.ts';

describe('rediscoverEntry', () => {
  it('develops the first time today’s pick is shown', () => {
    assert.equal(rediscoverEntry({ stampedWhenFirstShown: false, reduceMotion: false }), 'develop');
  });

  it('is already developed on every later visit that day', () => {
    assert.equal(rediscoverEntry({ stampedWhenFirstShown: true, reduceMotion: false }), 'developed');
  });

  it('is shown developed under reduce motion', () => {
    assert.equal(rediscoverEntry({ stampedWhenFirstShown: false, reduceMotion: true }), 'developed');
  });
});
