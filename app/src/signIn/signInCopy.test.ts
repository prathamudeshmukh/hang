import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signInTagline } from './signInCopy.ts';

describe('signInTagline', () => {
  it('gives the pitch when nothing is waiting', () => {
    assert.equal(signInTagline(0), 'Your links, hung on one wall.');
  });

  it('says one link is waiting, and to keep it', () => {
    assert.equal(signInTagline(1), '1 link waiting to hang. Sign in to keep it.');
  });

  it('counts several links, and says to keep them', () => {
    assert.equal(signInTagline(3), '3 links waiting to hang. Sign in to keep them.');
  });

  it('treats a count below zero as nothing waiting', () => {
    assert.equal(signInTagline(-1), 'Your links, hung on one wall.');
  });
});
