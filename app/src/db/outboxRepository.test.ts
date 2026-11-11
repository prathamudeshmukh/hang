/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createItemsRepository } from './itemsRepository.ts';
import { createOutboxRepository } from './outboxRepository.ts';
import { createTestDeps, T0 } from './testing/testDb.ts';

const URL = 'https://aeon.co/essays/on-boredom';
const LATER = T0 + 60_000;

function setup() {
  const deps = createTestDeps();
  const items = createItemsRepository(deps);
  const outbox = createOutboxRepository(deps);
  ['i1', 'i2'].forEach((id) => items.save({ id, sourceUrl: URL }));
  const [first, second] = outbox.list();
  return { outbox, first, second };
}

describe('outbox retry timing', () => {
  it('names when the head of the queue may be retried', () => {
    const { outbox, first } = setup();
    outbox.retryLater(first, { error: 'offline', nextAttemptAt: LATER });
    assert.equal(outbox.nextRetryAt(), LATER);
  });

  it('has no retry time when nothing is pending', () => {
    const { outbox, first, second } = setup();
    outbox.complete(first.seq);
    outbox.markFailed(second, 'check constraint');
    assert.equal(outbox.nextRetryAt(), null);
  });

  it('retryNow clears the wait on pending entries and keeps their attempts', () => {
    const { outbox, first } = setup();
    outbox.retryLater(first, { error: 'offline', nextAttemptAt: LATER });
    outbox.retryNow();
    assert.deepEqual(outbox.list().map(({ nextAttemptAt, attempts }) => ({ nextAttemptAt, attempts })), [
      { nextAttemptAt: 0, attempts: 1 },
      { nextAttemptAt: 0, attempts: 0 },
    ]);
  });

  it('retryNow leaves failed entries alone', () => {
    const { outbox, first } = setup();
    outbox.markFailed(first, 'check constraint');
    outbox.retryNow();
    assert.deepEqual(outbox.list().map((entry) => entry.status), ['failed', 'pending']);
  });
});
