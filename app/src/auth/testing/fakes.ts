import type { BindOutcome } from '../../db/deviceOwnerRepository.ts';
import type { SyncReport } from '../../sync/types.ts';
import type { AuthBackend, AuthSessionDeps, AuthUser, IdTokenResult } from '../types.ts';

export const ALICE: AuthUser = { id: '11111111-1111-4111-8111-111111111111', email: 'alice@example.com' };
export const BOB: AuthUser = { id: '22222222-2222-4222-8222-222222222222', email: 'bob@example.com' };

export const EMPTY_REPORT: SyncReport = { pushed: 0, failed: 0, waiting: false, pulled: { collections: 0, items: 0, item_content: 0 } };

export interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(error: unknown): void;
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** Every fake writes to one log, so tests can assert the order of side effects. */
export interface FakeWorld {
  readonly deps: AuthSessionDeps;
  readonly log: string[];
  /** Users the server knows, by ID token. */
  readonly tokens: Map<string, AuthUser>;
  setStoredUser(user: AuthUser | null): void;
  setGoogleResult(result: IdTokenResult): void;
  setOwner(userId: string | null): void;
  setUnsynced(count: number): void;
  /** The next sync() returns this promise instead of an empty report. */
  holdNextSync(pending: Promise<SyncReport>): void;
  /** Simulates supabase-js ending the session on its own (refresh token rejected). */
  endSessionRemotely(): void;
  failNext(step: 'wipe' | 'forget' | 'restore', error: Error): void;
}

function createFakeBackend(world: { log: string[]; tokens: Map<string, AuthUser> }) {
  let stored: AuthUser | null = null;
  const listeners = new Set<(user: AuthUser | null) => void>();
  const emit = (user: AuthUser | null) => listeners.forEach((listener) => listener(user));
  const backend: AuthBackend = {
    currentUser: async () => stored,
    async signInWithIdToken(idToken) {
      const user = world.tokens.get(idToken);
      if (!user) throw new Error('Invalid ID token');
      world.log.push(`backend.signIn ${user.email}`);
      stored = user;
      emit(user);
      return user;
    },
    async signOut() {
      world.log.push('backend.signOut');
      stored = null;
      emit(null);
    },
    onUserChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    backend,
    setStored: (user: AuthUser | null) => {
      stored = user;
    },
    endRemotely: () => {
      stored = null;
      emit(null);
    },
  };
}

export function createFakeWorld(): FakeWorld {
  const log: string[] = [];
  const tokens = new Map<string, AuthUser>([['token-alice', ALICE], ['token-bob', BOB]]);
  const fakeBackend = createFakeBackend({ log, tokens });
  let googleResult: IdTokenResult = { kind: 'token', idToken: 'token-alice' };
  let owner: string | null = null;
  let unsynced = 0;
  let heldSync: Promise<SyncReport> | null = null;
  const failures = new Map<'wipe' | 'forget' | 'restore', Error>();
  const throwIfFailing = (step: 'wipe' | 'forget' | 'restore') => {
    const error = failures.get(step);
    failures.delete(step);
    if (error) throw error;
  };

  const deps: AuthSessionDeps = {
    backend: {
      ...fakeBackend.backend,
      currentUser: async () => {
        throwIfFailing('restore');
        return fakeBackend.backend.currentUser();
      },
    },
    google: {
      getIdToken: async () => googleResult,
      forget: async () => {
        throwIfFailing('forget');
        log.push('google.forget');
      },
    },
    account: {
      bindTo(userId): BindOutcome {
        const outcome: BindOutcome = owner === null ? 'claimed' : owner === userId ? 'resumed' : 'reset';
        log.push(`account.bind ${outcome}`);
        owner = userId;
        return outcome;
      },
      wipe() {
        throwIfFailing('wipe');
        log.push('account.wipe');
        owner = null;
        unsynced = 0;
      },
      unsyncedCount: () => unsynced,
    },
    syncer: {
      async sync() {
        log.push('sync.start');
        const pending = heldSync ?? Promise.resolve(EMPTY_REPORT);
        heldSync = null;
        const report = await pending;
        log.push('sync.end');
        return report;
      },
    },
    wait: () => new Promise(() => undefined),
  };

  return {
    deps,
    log,
    tokens,
    setStoredUser: fakeBackend.setStored,
    setGoogleResult: (result) => {
      googleResult = result;
    },
    setOwner: (userId) => {
      owner = userId;
    },
    setUnsynced: (count) => {
      unsynced = count;
    },
    holdNextSync: (pending) => {
      heldSync = pending;
    },
    endSessionRemotely: fakeBackend.endRemotely,
    failNext: (step, error) => {
      failures.set(step, error);
    },
  };
}
