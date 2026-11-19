/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { blurred, CLOSED, discarded, failed, opened, submitted, typed } from './newCollectionDraft.ts';

describe('new collection draft', () => {
  it('opens empty, with no error', () => {
    assert.deepEqual(opened(), { kind: 'open', text: '', error: null });
  });

  it('a typed name starts with no error', () => {
    const draft = typed('Reading 2');
    assert.deepEqual(draft, { kind: 'open', text: 'Reading 2', error: null });
  });

  it('keeps the name and shows why it was refused', () => {
    const draft = failed(typed('Reading'), 'You already have “Reading”');
    assert.deepEqual(draft, { kind: 'open', text: 'Reading', error: 'You already have “Reading”' });
  });

  it('survives a blur while it holds a name', () => {
    const draft = typed('Reading');
    assert.equal(blurred(draft), draft);
  });

  it('folds back on a blur when nothing was typed', () => {
    assert.equal(blurred(typed('   ')), CLOSED);
  });

  it('is thrown away when another chip is picked', () => {
    assert.equal(discarded(), CLOSED);
  });
});

describe('submitting a draft', () => {
  it('asks to create a typed name, trimmed', () => {
    assert.deepEqual(submitted(typed('  Reading ')), { kind: 'create', name: 'Reading' });
  });

  it('cancels an empty name instead of creating it', () => {
    assert.deepEqual(submitted(typed('  ')), { kind: 'cancel' });
  });

  it('has nothing to submit while closed', () => {
    assert.deepEqual(submitted(CLOSED), { kind: 'cancel' });
  });
});
