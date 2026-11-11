/// <reference types="node" />
import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { SyncReport } from '../sync/types.ts';
import { createAuthSession } from './authSession.ts';
import { ALICE, BOB, createFakeWorld, deferred, EMPTY_REPORT, type FakeWorld } from './testing/fakes.ts';

function setup(world: FakeWorld = createFakeWorld()) {
  return { world, session: createAuthSession(world.deps) };
}

describe('auth session: start', () => {
  it('restores a stored session, binds the device and syncs', async () => {
    const world = createFakeWorld();
    world.setStoredUser(ALICE);
    const { session } = setup(world);
    await session.start();
    assert.deepEqual(session.getSnapshot().status, { kind: 'signedIn', user: ALICE });
    assert.deepEqual(world.log, ['account.bind claimed', 'sync.start', 'sync.end']);
  });

  it('is signed out with no stored session, and does not sync', async () => {
    const { world, session } = setup();
    await session.start();
    assert.deepEqual(session.getSnapshot().status, { kind: 'signedOut' });
    assert.deepEqual(world.log, []);
  });

  it('restores once, however often start is called', async () => {
    const world = createFakeWorld();
    world.setStoredUser(ALICE);
    const { session } = setup(world);
    await Promise.all([session.start(), session.start()]);
    assert.deepEqual(world.log, ['account.bind claimed', 'sync.start', 'sync.end']);
  });

  it('is signed out when the stored session cannot be read', async () => {
    const world = createFakeWorld();
    world.failNext('restore', new Error('session refresh rejected'));
    const { session } = setup(world);
    await session.start();
    assert.deepEqual(session.getSnapshot().status, { kind: 'signedOut' });
  });

  it('starts as restoring', () => {
    assert.deepEqual(setup().session.getSnapshot().status, { kind: 'restoring' });
  });
});

describe('auth session: sign in', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(async () => {
    t = setup();
    await t.session.start();
  });

  it('signs in with the Google ID token, binds the device, then syncs', async () => {
    const outcome = await t.session.signIn();
    assert.deepEqual(outcome, { kind: 'signedIn', user: ALICE });
    assert.deepEqual(t.world.log, ['backend.signIn alice@example.com', 'account.bind claimed', 'sync.start', 'sync.end']);
    assert.deepEqual(t.session.getSnapshot().lastSync, { kind: 'ok', report: EMPTY_REPORT });
  });

  it('stays signed out when the picker is cancelled', async () => {
    t.world.setGoogleResult({ kind: 'cancelled' });
    const outcome = await t.session.signIn();
    assert.deepEqual(outcome, { kind: 'cancelled' });
    assert.deepEqual(t.session.getSnapshot().status, { kind: 'signedOut' });
  });

  it('reports a failure the server rejects, and stays signed out', async () => {
    t.world.setGoogleResult({ kind: 'token', idToken: 'forged' });
    const outcome = await t.session.signIn();
    assert.deepEqual(outcome, { kind: 'failed', message: 'Invalid ID token' });
    assert.deepEqual(t.session.getSnapshot().status, { kind: 'signedOut' });
  });

  it('resets the device when a different user signs in', async () => {
    t.world.setOwner(BOB.id);
    await t.session.signIn();
    assert.ok(t.world.log.includes('account.bind reset'));
  });

  it('stays signed in when the first sync fails, recording the error', async () => {
    t.world.holdNextSync(Promise.reject(new Error('offline')));
    await t.session.signIn();
    assert.equal(t.session.getSnapshot().status.kind, 'signedIn');
    assert.deepEqual(t.session.getSnapshot().lastSync, { kind: 'error', message: 'offline' });
  });

  it('lets a sync still running for the previous user finish before the device changes hands', async () => {
    const running = deferred<SyncReport>();
    t.world.holdNextSync(running.promise);
    const alice = t.session.signIn();
    await new Promise((resolve) => setImmediate(resolve));
    t.world.endSessionRemotely();
    t.world.setGoogleResult({ kind: 'token', idToken: 'token-bob' });
    const bob = t.session.signIn();
    await new Promise((resolve) => setImmediate(resolve));
    running.resolve(EMPTY_REPORT);
    await Promise.all([alice, bob]);
    assert.deepEqual(t.world.log.slice(1), ['account.bind claimed', 'sync.start', 'backend.signIn bob@example.com', 'sync.end', 'account.bind reset', 'sync.start', 'sync.end']);
  });

  it('does nothing when already signed in', async () => {
    await t.session.signIn();
    const before = t.world.log.length;
    const outcome = await t.session.signIn();
    assert.deepEqual(outcome, { kind: 'signedIn', user: ALICE });
    assert.equal(t.world.log.length, before);
  });

  it('notifies subscribers with a new snapshot', async () => {
    const seen: string[] = [];
    t.session.subscribe(() => seen.push(t.session.getSnapshot().status.kind));
    await t.session.signIn();
    assert.equal(seen.at(-1), 'signedIn');
  });
});

describe('auth session: sync gate', () => {
  it('does not sync while signed out', async () => {
    const { world, session } = setup();
    await session.start();
    const report = await session.sync();
    assert.equal(report, null);
    assert.deepEqual(world.log, []);
  });
});

describe('auth session: sign out', () => {
  let t: ReturnType<typeof setup>;
  beforeEach(async () => {
    t = setup();
    await t.session.start();
    await t.session.signIn();
    t.world.log.length = 0;
  });

  it('check syncs first, then reports what is still unsynced', async () => {
    t.world.setUnsynced(2);
    const check = await t.session.checkSignOut();
    assert.deepEqual(check, { unsynced: 2 });
    assert.deepEqual(t.world.log, ['sync.start', 'sync.end']);
  });

  it('check gives up on a sync that takes too long', async () => {
    const world = createFakeWorld();
    const session = createAuthSession({ ...world.deps, wait: async () => undefined });
    await session.start();
    await session.signIn();
    world.holdNextSync(new Promise<SyncReport>(() => undefined));
    world.setUnsynced(1);
    assert.deepEqual(await session.checkSignOut(), { unsynced: 1 });
  });

  it('waits for a running sync, then wipes, then ends the session', async () => {
    const running = deferred<SyncReport>();
    t.world.holdNextSync(running.promise);
    const syncing = t.session.sync();
    const signingOut = t.session.signOut();
    running.resolve(EMPTY_REPORT);
    await Promise.all([syncing, signingOut]);
    assert.deepEqual(t.world.log, ['sync.start', 'sync.end', 'account.wipe', 'backend.signOut', 'google.forget']);
    assert.deepEqual(t.session.getSnapshot().status, { kind: 'signedOut' });
  });

  it('stays signed in, with the session intact, when the wipe fails', async () => {
    t.world.failNext('wipe', new Error('disk I/O error'));
    await assert.rejects(t.session.signOut(), /disk I\/O error/);
    assert.equal(t.session.getSnapshot().status.kind, 'signedIn');
    assert.equal(t.world.log.includes('backend.signOut'), false);
  });

  it('still signs out when Google fails to forget the account', async () => {
    t.world.failNext('forget', new Error('play services gone'));
    await t.session.signOut();
    assert.deepEqual(t.session.getSnapshot().status, { kind: 'signedOut' });
  });

  it('keeps local data when the session ends on its own', async () => {
    t.world.endSessionRemotely();
    assert.deepEqual(t.session.getSnapshot().status, { kind: 'signedOut' });
    assert.equal(t.world.log.includes('account.wipe'), false);
  });
});
