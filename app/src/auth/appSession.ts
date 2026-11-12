import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import { db } from '@/db/client';
import { createDeviceOwnerRepository } from '@/db/deviceOwnerRepository';
import { createOutboxRepository } from '@/db/outboxRepository';
import { createSqliteSyncStore } from '@/db/sqliteSyncStore';
import { systemClock } from '@/db/types';
import { createSyncEngine } from '@/sync/engine';
import { fetchWithTimeout, REQUEST_TIMEOUT_MS } from '@/sync/fetchWithTimeout';
import { createSupabaseRemote } from '@/sync/supabaseRemote';
import type { SyncReport } from '@/sync/types';
import { createExpoThumbFiles } from '@/thumbs/expoThumbFiles';
import { createSupabaseThumbSigner } from '@/thumbs/supabaseThumbSigner';
import { createThumbStore } from '@/thumbs/thumbStore';
import { createThumbSync } from '@/thumbs/thumbSync';
import { createAuthSession } from './authSession';
import { createGoogleIdTokenProvider } from './googleIdToken';
import { createSecureSessionStorage } from './secureSessionStorage';
import { createSupabaseAuthBackend } from './supabaseAuthBackend';

/** Expo inlines EXPO_PUBLIC_* only when read as literal `process.env.NAME`, so each is read by name. */
function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set (app/.env)`);
  return value;
}

const SESSION_STORAGE_KEY = 'hang-session';
const sessionStorage = createSecureSessionStorage(SecureStore);

export const supabase = createClient(
  required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
  required('EXPO_PUBLIC_SUPABASE_ANON_KEY', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY),
  {
    global: { fetch: fetchWithTimeout(fetch, REQUEST_TIMEOUT_MS) },
    auth: {
      storage: sessionStorage,
      storageKey: SESSION_STORAGE_KEY,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

// Supabase's React Native guidance: refresh tokens only while the app is in the foreground.
AppState.addEventListener('change', (state) => {
  if (state === 'active') void supabase.auth.startAutoRefresh();
  else void supabase.auth.stopAutoRefresh();
});

const repositoryDeps = { db, clock: systemClock };
const deviceOwner = createDeviceOwnerRepository(repositoryDeps);
const outbox = createOutboxRepository(repositoryDeps);
const syncEngine = createSyncEngine({
  store: createSqliteSyncStore(repositoryDeps),
  remote: createSupabaseRemote(supabase),
  clock: systemClock,
});

const thumbs = createThumbSync({
  store: createThumbStore(db),
  files: createExpoThumbFiles(),
  signer: createSupabaseThumbSigner(supabase),
  log: (message) => console.warn(`[thumbs] ${message}`),
});
const settleThumbs = (work: Promise<unknown>) => void work.catch((error: unknown) => console.warn(`[thumbs] ${String(error)}`));

/** Thumbnails follow every sync (SPEC §4); sync only runs while signed in, which signing needs. */
const syncer = {
  async sync(): Promise<SyncReport> {
    const report = await syncEngine.sync();
    settleThumbs(thumbs.run());
    return report;
  },
};

/** A wipe (sign-out, or another account) takes this account's thumbnails with it. */
function wipeAccount(): void {
  deviceOwner.wipe();
  settleThumbs(thumbs.reconcile());
}

// At launch, finish any cleanup a killed app left behind.
settleThumbs(thumbs.reconcile());

/** One per process, shared by the main app and the share sheet (same JS runtime). */
export const authSession = createAuthSession({
  backend: createSupabaseAuthBackend({ client: supabase, storage: sessionStorage, storageKey: SESSION_STORAGE_KEY }),
  google: createGoogleIdTokenProvider({
    api: GoogleSignin,
    webClientId: required('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID', process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    cancelledCode: statusCodes.SIGN_IN_CANCELLED,
  }),
  account: {
    bindTo: deviceOwner.bindTo,
    wipe: wipeAccount,
    unsyncedCount: () => outbox.list().length,
  },
  syncer,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});
