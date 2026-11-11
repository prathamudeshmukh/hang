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
    wipe: deviceOwner.wipe,
    unsyncedCount: () => outbox.list().length,
  },
  syncer: syncEngine,
  wait: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
});
