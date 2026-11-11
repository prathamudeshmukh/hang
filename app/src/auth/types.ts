import type { BindOutcome } from '../db/deviceOwnerRepository.ts';
import type { SyncReport } from '../sync/types.ts';

export interface AuthUser {
  readonly id: string;
  readonly email: string | null;
}

/** The Google account picker. Cancelling is an outcome, not an error. */
export type IdTokenResult = { readonly kind: 'token'; readonly idToken: string } | { readonly kind: 'cancelled' };

export interface GoogleIdTokenProvider {
  getIdToken(): Promise<IdTokenResult>;
  /** Forget the chosen Google account so the next sign-in shows the picker again. */
  forget(): Promise<void>;
}

/** Supabase Auth, as the session needs it (`createSupabaseAuthBackend`). */
export interface AuthBackend {
  currentUser(): Promise<AuthUser | null>;
  signInWithIdToken(idToken: string): Promise<AuthUser>;
  /** This device only: other sessions stay signed in. */
  signOut(): Promise<void>;
  /** Called with null when the session ends (sign-out, or a refresh token the server rejects). */
  onUserChange(listener: (user: AuthUser | null) => void): () => void;
}

export interface LocalAccount {
  bindTo(userId: string): BindOutcome;
  wipe(): void;
  /** Changes still in the outbox, pending or failed. */
  unsyncedCount(): number;
}

export interface Syncer {
  sync(): Promise<SyncReport>;
}

export type LastSync =
  | { readonly kind: 'never' }
  | { readonly kind: 'ok'; readonly report: SyncReport }
  | { readonly kind: 'error'; readonly message: string };

export type AuthStatus =
  | { readonly kind: 'restoring' }
  | { readonly kind: 'signedOut' }
  | { readonly kind: 'signedIn'; readonly user: AuthUser }
  | { readonly kind: 'signingOut'; readonly user: AuthUser };

export interface AuthSnapshot {
  readonly status: AuthStatus;
  readonly lastSync: LastSync;
}

export type SignInOutcome =
  | { readonly kind: 'signedIn'; readonly user: AuthUser }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'failed'; readonly message: string };

/** What sign-out would lose. Zero means it's safe to sign out without asking. */
export interface SignOutCheck {
  readonly unsynced: number;
}

export interface AuthSessionDeps {
  readonly backend: AuthBackend;
  readonly google: GoogleIdTokenProvider;
  readonly account: LocalAccount;
  readonly syncer: Syncer;
  /** Resolves after `ms`; injected so tests don't wait. */
  readonly wait: (ms: number) => Promise<void>;
}
