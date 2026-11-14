/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { eq } from 'drizzle-orm';
import { createItemsRepository } from '../db/itemsRepository.ts';
import { items, outbox } from '../db/schema.ts';
import { createTestDeps, T0 } from '../db/testing/testDb.ts';
import { pickRediscover, rediscoverWindow } from '../home/rediscover.ts';
import { backdateForRediscover } from './rediscoverBackdate.ts';

const DAY_MS = 24 * 60 * 60 * 1000;

function setup() {
  const deps = createTestDeps();
  const repo = createItemsRepository(deps);
  const share = (id: string) => repo.save({ id, sourceUrl: `https://example.com/${id}` });
  const ready = (id: string) => deps.db.update(items).set({ status: 'ready', lastOpenedAt: new Date(T0).toISOString() }).where(eq(items.id, id)).run();
  return { deps, repo, share, ready };
}

describe('backdateForRediscover', () => {
  it('makes the newest ready item today’s Rediscover pick', () => {
    const { deps, repo, share, ready } = setup();
    share('old');
    ready('old');
    deps.clock.advance(1000);
    share('new');
    ready('new');
    const now = new Date(T0 + DAY_MS);

    assert.equal(backdateForRediscover(deps.db, now), 'new');
    assert.equal(pickRediscover(repo.listRediscoverCandidates(rediscoverWindow(now)), now)?.id, 'new');
  });

  it('stays on this device: nothing is queued for the server', () => {
    const { deps, share, ready } = setup();
    share('a');
    ready('a');
    const queued = deps.db.select().from(outbox).all().length;

    backdateForRediscover(deps.db, new Date(T0));
    assert.equal(deps.db.select().from(outbox).all().length, queued);
  });

  it('does nothing when no item is ready', () => {
    const { deps, share } = setup();
    share('a');
    assert.equal(backdateForRediscover(deps.db, new Date(T0)), null);
  });
});
