/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { countInWords, dayKey, dayLine, greetingFor, savedMonthNote, dayWords } from './homeCopy.ts';

const at = (hour: number, minute = 0) => new Date(2026, 10, 8, hour, minute);

describe('greetingFor', () => {
  it('says good morning from 05:00', () => {
    assert.equal(greetingFor(at(5)), 'Good morning');
  });

  it('says good afternoon from noon until 18:00', () => {
    assert.equal(greetingFor(at(12)), 'Good afternoon');
    assert.equal(greetingFor(at(17, 59)), 'Good afternoon');
  });

  it('says good evening from 18:00 through the night', () => {
    assert.equal(greetingFor(at(18)), 'Good evening');
    assert.equal(greetingFor(at(4, 59)), 'Good evening');
  });
});

describe('dayLine', () => {
  it('names the weekday, day and month', () => {
    assert.equal(dayLine(at(9)), 'Sunday, 8 November');
  });
});

describe('dayKey', () => {
  it('is the local calendar date, zero-padded', () => {
    assert.equal(dayKey(new Date(2026, 0, 5, 23, 30)), '2026-01-05');
  });
});

describe('savedMonthNote', () => {
  const today = at(9);

  it('names the month for this year', () => {
    assert.equal(savedMonthNote(new Date(2026, 2, 14).toISOString(), today), 'from March');
  });

  it('adds the year for earlier years', () => {
    assert.equal(savedMonthNote(new Date(2025, 9, 1).toISOString(), today), 'from October 2025');
  });

  it('says nothing for an unreadable date', () => {
    assert.equal(savedMonthNote('not a date', today), null);
  });
});

describe('countInWords', () => {
  it('spells out zero to twelve', () => {
    assert.deepEqual([0, 4, 12].map(countInWords), ['none', 'four', 'twelve']);
  });

  it('uses digits above twelve', () => {
    assert.equal(countInWords(13), '13');
  });
});

describe('dayWords', () => {
  const TODAY = new Date('2026-11-14T09:00:00');

  it('says today and yesterday in words', () => {
    assert.deepEqual([dayWords(new Date('2026-11-14T00:30:00'), TODAY), dayWords(new Date('2026-11-13T23:30:00'), TODAY)], ['today', 'yesterday']);
  });

  it('gives the day and short month, with the year only when it is not this one', () => {
    assert.deepEqual([dayWords(new Date('2026-11-03T10:00:00'), TODAY), dayWords(new Date('2025-12-24T10:00:00'), TODAY)], ['3 Nov', '24 Dec 2025']);
  });
});
