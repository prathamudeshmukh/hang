/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sheetHint, sheetNote } from './sheetNote.ts';

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
