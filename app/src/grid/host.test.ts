/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { hostOf } from './host.ts';

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
