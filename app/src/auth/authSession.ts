import type { SyncReport } from '../sync/types.ts';
import type {
  AuthSessionDeps,
  AuthSnapshot,
  AuthStatus,
  AuthUser,
  LastSync,
  SignInOutcome,
  SignOutCheck,
} from './types.ts';

/** How long sign-out waits for a last sync before asking whether to drop unsynced changes. */
export const SIGN_OUT_SYNC_TIMEOUT_MS = 5000;

const NEVER_SYNCED: LastSync = { kind: 'never' };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Who is signed in, and what that means for the data on the device (PHASE1, slice 5 decisions):
 * - sign-in binds the device to the user (claim unclaimed rows, resume, or wipe for a different user);
 * - sync only runs while signed in;
 * - sign-out waits for a running sync, wipes local data, then ends the session;
 * - a session that ends on its own (refresh token rejected) keeps local data for the same user's return.
 */
export function createAuthSession({ backend, google, account, syncer, wait }: AuthSessionDeps) {
  let snapshot: AuthSnapshot = { status: { kind: 'restoring' }, lastSync: NEVER_SYNCED };
  let inFlight: Promise<SyncReport | null> | null = null;
  let started: Promise<void> | null = null;
  const listeners = new Set<() => void>();

  function publish(next: Partial<AuthSnapshot>): void {
    snapshot = { ...snapshot, ...next };
    listeners.forEach((listener) => listener());
  }

  const setStatus = (status: AuthStatus) => publish({ status });

  async function runSync(): Promise<SyncReport | null> {
    try {
      const report = await syncer.sync();
      publish({ lastSync: { kind: 'ok', report } });
      return report;
    } catch (error) {
      publish({ lastSync: { kind: 'error', message: errorMessage(error) } });
      return null;
    }
  }

  /** Never throws; resolves to null when signed out or when the sync failed (see `lastSync`). */
  function sync(): Promise<SyncReport | null> {
    if (snapshot.status.kind !== 'signedIn') return Promise.resolve(null);
    const run = runSync().finally(() => {
      if (inFlight === run) inFlight = null;
    });
    inFlight = run;
    return run;
  }

  /**
   * A sync still running for the previous user (after a session ended on its own) could otherwise
   * land its rows after the wipe and hand them to the next user. Requests time out, so this wait ends.
   */
  async function becomeSignedIn(user: AuthUser): Promise<void> {
    await inFlight;
    account.bindTo(user.id);
    setStatus({ kind: 'signedIn', user });
    await sync();
  }

  backend.onUserChange((user) => {
    if (user === null && snapshot.status.kind === 'signedIn') setStatus({ kind: 'signedOut' });
  });

  async function restore(): Promise<void> {
    try {
      const user = await backend.currentUser();
      if (user) return await becomeSignedIn(user);
    } catch (error) {
      publish({ lastSync: { kind: 'error', message: errorMessage(error) } });
    }
    setStatus({ kind: 'signedOut' });
  }

  /** Restores the stored session once per process; later calls share the first run. */
  function start(): Promise<void> {
    started ??= restore();
    return started;
  }

  async function signIn(): Promise<SignInOutcome> {
    const { status } = snapshot;
    if (status.kind === 'signedIn') return { kind: 'signedIn', user: status.user };
    try {
      const result = await google.getIdToken();
      if (result.kind === 'cancelled') return result;
      const user = await backend.signInWithIdToken(result.idToken);
      await becomeSignedIn(user);
      return { kind: 'signedIn', user };
    } catch (error) {
      return { kind: 'failed', message: errorMessage(error) };
    }
  }

  async function checkSignOut(): Promise<SignOutCheck> {
    await Promise.race([sync(), wait(SIGN_OUT_SYNC_TIMEOUT_MS)]);
    return { unsynced: account.unsyncedCount() };
  }

  /** Wipe before ending the session: a crash in between leaves a signed-in, empty device that pulls again. */
  async function signOut(): Promise<void> {
    const { status } = snapshot;
    if (status.kind !== 'signedIn') return;
    setStatus({ kind: 'signingOut', user: status.user });
    try {
      await inFlight;
      account.wipe();
    } catch (error) {
      setStatus(status);
      throw error;
    }
    try {
      await backend.signOut();
    } finally {
      publish({ status: { kind: 'signedOut' }, lastSync: NEVER_SYNCED });
    }
    await forgetGoogleAccount();
  }

  /** Best effort: the session is already gone; failing here only skips the account picker next time. */
  async function forgetGoogleAccount(): Promise<void> {
    try {
      await google.forget();
    } catch (error) {
      console.warn('Could not clear the Google account after sign-out', errorMessage(error));
    }
  }

  return {
    start,
    signIn,
    sync,
    checkSignOut,
    signOut,
    getSnapshot: (): AuthSnapshot => snapshot,
    subscribe(listener: () => void): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export type AuthSession = ReturnType<typeof createAuthSession>;
