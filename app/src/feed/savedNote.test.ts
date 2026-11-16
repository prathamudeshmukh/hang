/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { savedNote } from './savedNote.ts';

/** Local wall-clock times, so the tests hold in any timezone. */
const NOW = new Date(2026, 10, 16, 9, 30);
const savedAt = (year: number, month: number, day: number, hour = 12) => new Date(year, month, day, hour).toISOString();

describe('savedNote recent days', () => {
  it('says today and yesterday by the calendar, not by 24 hours', () => {
    const notes = [savedAt(2026, 10, 16, 0), savedAt(2026, 10, 15, 23)].map((at) => savedNote(at, NOW));
    assert.deepEqual(notes, ['saved today', 'saved yesterday']);
  });

  it('counts days up to six', () => {
    assert.deepEqual([savedAt(2026, 10, 14), savedAt(2026, 10, 10)].map((at) => savedNote(at, NOW)), ['saved 2 days ago', 'saved 6 days ago']);
  });

  it('treats a time ahead of the clock as today', () => {
    assert.equal(savedNote(savedAt(2026, 10, 17), NOW), 'saved today');
  });
});

describe('savedNote weeks', () => {
  it('says last week from seven to thirteen days', () => {
    assert.deepEqual([savedAt(2026, 10, 9), savedAt(2026, 10, 3)].map((at) => savedNote(at, NOW)), ['saved last week', 'saved last week']);
  });

  it('switches from last week to weeks on day fourteen', () => {
    assert.deepEqual([savedAt(2026, 10, 3), savedAt(2026, 10, 2)].map((at) => savedNote(at, NOW)), ['saved last week', 'saved 2 weeks ago']);
  });

  it('counts weeks up to four', () => {
    assert.deepEqual([savedAt(2026, 10, 2), savedAt(2026, 9, 13)].map((at) => savedNote(at, NOW)), ['saved 2 weeks ago', 'saved 4 weeks ago']);
  });
});

describe('savedNote months', () => {
  it('names the month from day thirty-five', () => {
    assert.deepEqual([savedAt(2026, 9, 13), savedAt(2026, 9, 12)].map((at) => savedNote(at, NOW)), ['saved 4 weeks ago', 'saved in October']);
  });

  it('names the month after five weeks, with the year only when it isn’t this one', () => {
    const notes = [savedAt(2026, 2, 3), savedAt(2025, 2, 3)].map((at) => savedNote(at, NOW));
    assert.deepEqual(notes, ['saved in March', 'saved in March 2025']);
  });

  it('says nothing for a time it can’t read', () => {
    assert.equal(savedNote('not a date', NOW), null);
  });
});
