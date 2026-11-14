/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { ExistingItem, ExistingOpening } from './shareCapture.ts';
import { canSave, existingNote, sheetHint, sheetNote } from './sheetNote.ts';

describe('sheetNote', () => {
  it('says the link is being read while it saves and once saved', () => {
    assert.equal(sheetNote(null, 'aeon.co'), 'aeon.co · reading it now…');
    assert.equal(sheetNote({ kind: 'saved', itemId: 'i1', collections: [] }, 'aeon.co'), 'aeon.co · reading it now…');
  });

  it('explains shares that are not saved', () => {
    assert.equal(sheetNote({ kind: 'notSaved', reason: 'image' }, 'image'), 'images can’t hang here yet');
    assert.equal(sheetNote({ kind: 'notSaved', reason: 'unsupported' }, 'link'), 'nothing to hang here');
  });

  it('says plainly when a save failed', () => {
    assert.equal(sheetNote({ kind: 'failed' }, 'aeon.co'), 'Couldn’t save this link');
  });
});

describe('sheetHint', () => {
  it('promises the Inbox only when the share is (being) saved', () => {
    assert.equal(sheetHint(null), 'Swipe down to leave it in Inbox');
    assert.equal(sheetHint({ kind: 'saved', itemId: 'i1', collections: [] }), 'Swipe down to leave it in Inbox');
  });

  it('just offers to close when nothing was saved', () => {
    assert.equal(sheetHint({ kind: 'notSaved', reason: 'unsupported' }), 'Swipe down to close');
    assert.equal(sheetHint({ kind: 'failed' }), 'Swipe down to close');
  });
});

describe('the sheet for a link Hang already has (#19)', () => {
  const TODAY = new Date('2026-11-14T09:00:00');
  const inTech: ExistingItem = { id: 'old', title: 'What happened to 3Com?', place: { id: 'c1', name: 'Tech' }, createdAt: '2026-11-03T10:00:00', readAt: null, thumbUri: null };
  const existing = (item: Partial<ExistingItem> = {}): ExistingOpening => ({ kind: 'existing', item: { ...inTech, ...item }, collections: [] });

  it('says where it hangs and since when', () => {
    assert.deepEqual(existingNote(existing(), TODAY), { struck: null, text: 'already hanging in Tech · since 3 Nov' });
    assert.deepEqual(existingNote(existing({ place: null, createdAt: '2026-11-13T20:00:00' }), TODAY), { struck: null, text: 'already in your Inbox · since yesterday' });
  });

  it('strikes “unread” once it has been read', () => {
    assert.deepEqual(existingNote(existing({ readAt: '2026-11-08T21:00:00' }), TODAY), { struck: 'unread', text: 'read · 8 Nov · in Tech' });
    assert.deepEqual(existingNote(existing({ place: null, readAt: '2026-11-14T08:00:00' }), TODAY), { struck: 'unread', text: 'read · today · in your Inbox' });
  });

  it('offers Save only when you pick somewhere it is not', () => {
    assert.deepEqual([canSave(existing(), 'c1'), canSave(existing(), 'c2'), canSave(existing({ place: null }), null)], [false, true, false]);
  });

  it('hints at leaving it where it is, or at the move', () => {
    assert.equal(sheetHint(existing(), 'c1'), 'Swipe down to leave it in Tech');
    assert.equal(sheetHint(existing(), 'c2'), 'Moves it from Tech');
    assert.equal(sheetHint(existing({ place: null }), 'c2'), 'Swipe down to leave it in Inbox');
  });

  it('keeps the year for an older date', () => {
    assert.equal(existingNote(existing({ createdAt: '2025-12-24T10:00:00' }), TODAY).text, 'already hanging in Tech · since 24 Dec 2025');
  });
});
