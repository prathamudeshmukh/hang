import { isAuthRetryableFetchError, type SupabaseClient } from '@supabase/supabase-js';
import { z } from 'zod';
import type { SessionStorage } from './secureSessionStorage.ts';
import type { AuthBackend, AuthUser } from './types.ts';

export interface SupabaseAuthBackendDeps {
  readonly client: SupabaseClient;
  /** The same storage and key the client was created with. */
  readonly storage: SessionStorage;
  readonly storageKey: string;
}

const storedSession = z.object({ user: z.object({ id: z.string().min(1), email: z.string().nullish() }) });

const toAuthUser = (user: { readonly id: string; readonly email?: string | null }): AuthUser => ({ id: user.id, email: user.email ?? null });

/**
 * Offline with an expired access token, supabase-js can't refresh, but it keeps the stored session and
 * retries later. The user is still signed in: read who it is from storage so local data stays reachable.
 */
async function storedUser({ storage, storageKey }: SupabaseAuthBackendDeps): Promise<AuthUser | null> {
  const raw = await storage.getItem(storageKey);
  if (!raw) return null;
  const parsed = storedSession.safeParse(JSON.parse(raw));
  return parsed.success ? toAuthUser(parsed.data.user) : null;
}

/** supabase-js auth as the session sees it. The session itself lives in the client's storage (SecureStore). */
export function createSupabaseAuthBackend(deps: SupabaseAuthBackendDeps): AuthBackend {
  const { client } = deps;
  return {
    async currentUser() {
      const { data, error } = await client.auth.getSession();
      if (!error) return data.session ? toAuthUser(data.session.user) : null;
      if (isAuthRetryableFetchError(error)) return storedUser(deps);
      throw error;
    },

    async signInWithIdToken(idToken) {
      const { data, error } = await client.auth.signInWithIdToken({ provider: 'google', token: idToken });
      if (error) throw error;
      return toAuthUser(data.user);
    },

    async signOut() {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) throw error;
    },

    onUserChange(listener) {
      const { data } = client.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') listener(null);
        else if (session) listener(toAuthUser(session.user));
      });
      return () => data.subscription.unsubscribe();
    },
  };
}
