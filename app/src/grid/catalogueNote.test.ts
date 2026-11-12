/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { durationNote, joinNote, minutesNote, thingsCount } from './catalogueNote.ts';

describe('durationNote', () => {
  it('rounds up to whole minutes', () => {
    assert.equal(durationNote(13 * 60 + 1), '14 min');
  });

  it('writes an hour and more as hours and two-digit minutes', () => {
    assert.equal(durationNote(80 * 60), '1 h 20');
    assert.equal(durationNote(65 * 60), '1 h 05');
    assert.equal(durationNote(120 * 60), '2 h');
  });

  it('has nothing to say about a missing, zero or negative duration', () => {
    assert.equal(durationNote(null), null);
    assert.equal(durationNote(0), null);
    assert.equal(durationNote(-5), null);
  });
});

describe('minutesNote', () => {
  it('writes reading minutes', () => {
    assert.equal(minutesNote(9), '9 min');
  });

  it('has nothing to say about missing or zero minutes', () => {
    assert.equal(minutesNote(null), null);
    assert.equal(minutesNote(0), null);
  });
});

describe('joinNote', () => {
  it('joins the parts it has with a middle dot', () => {
    assert.equal(joinNote(['9 min', null, 'Aeon']), '9 min · Aeon');
  });

  it('is empty when there are no parts', () => {
    assert.equal(joinNote([null, null]), '');
  });
});

describe('thingsCount', () => {
  it('counts one thing and many things', () => {
    assert.equal(thingsCount(1), '1 thing');
    assert.equal(thingsCount(23), '23 things');
  });

  it('counts none as things', () => {
    assert.equal(thingsCount(0), '0 things');
  });
});
