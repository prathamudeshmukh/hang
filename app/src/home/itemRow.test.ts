/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hostOf, rowNote } from './itemRow.ts';

describe('hostOf', () => {
  it('drops the scheme, path and a leading www', () => {
    assert.equal(hostOf('https://www.aeon.co/essays/on-boredom?x=1'), 'aeon.co');
  });

  it('keeps other subdomains', () => {
    assert.equal(hostOf('https://news.ycombinator.com/item?id=1'), 'news.ycombinator.com');
  });

  it('falls back to the text it was given when it is not a URL', () => {
    assert.equal(hostOf('not a url'), 'not a url');
  });
});

describe('rowNote', () => {
  it('says nothing about a ready, synced item', () => {
    assert.equal(rowNote({ status: 'ready', queued: false }), null);
  });

  it('names a status still worth knowing', () => {
    assert.equal(rowNote({ status: 'pending', queued: false }), 'pending');
    assert.equal(rowNote({ status: 'failed', queued: false }), 'couldn’t fetch details');
  });

  it('adds that it waits to sync', () => {
    assert.equal(rowNote({ status: 'ready', queued: true }), 'waiting to sync');
    assert.equal(rowNote({ status: 'extracting', queued: true }), 'fetching details · waiting to sync');
  });
});
