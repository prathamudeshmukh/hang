import type { GoogleIdTokenProvider } from './types.ts';

/** The slice of `GoogleSignin` (@react-native-google-signin, free tier) this needs; injected for tests. */
export interface GoogleSignInApi {
  configure(options: { readonly webClientId: string }): void;
  hasPlayServices(options: { readonly showPlayServicesUpdateDialog: boolean }): Promise<boolean>;
  signIn(): Promise<{ readonly type: 'success'; readonly data: { readonly idToken: string | null } } | { readonly type: 'cancelled' }>;
  signOut(): Promise<unknown>;
}

export interface GoogleIdTokenConfig {
  readonly api: GoogleSignInApi;
  /** The Web OAuth client: Supabase checks the ID token's audience against it. */
  readonly webClientId: string;
  /** The library's `statusCodes`, so a cancel reported as an error maps to `cancelled`. */
  readonly cancelledCode: string;
}

function hasCode(error: unknown, code: string): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === code;
}

export function createGoogleIdTokenProvider({ api, webClientId, cancelledCode }: GoogleIdTokenConfig): GoogleIdTokenProvider {
  if (!webClientId) throw new Error('EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set');
  api.configure({ webClientId });

  return {
    async getIdToken() {
      try {
        await api.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const response = await api.signIn();
        if (response.type === 'cancelled') return { kind: 'cancelled' };
        if (!response.data.idToken) throw new Error('Google returned no ID token: check the Web client ID');
        return { kind: 'token', idToken: response.data.idToken };
      } catch (error) {
        if (hasCode(error, cancelledCode)) return { kind: 'cancelled' };
        throw error;
      }
    },
    forget: async () => {
      await api.signOut();
    },
  };
}
