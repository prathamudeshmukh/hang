/** The slice of expo-secure-store this needs; injected so it runs in Node tests. */
export interface KeyValueStore {
  getItemAsync(key: string): Promise<string | null>;
  setItemAsync(key: string, value: string): Promise<void>;
  deleteItemAsync(key: string): Promise<void>;
}

/** The storage shape supabase-js accepts for `auth.storage`. */
export interface SessionStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

/** SecureStore keys may only hold letters, digits, `.`, `-` and `_`. */
const UNSAFE_KEY_CHARACTERS = /[^A-Za-z0-9._-]/g;
const safeKey = (key: string) => key.replace(UNSAFE_KEY_CHARACTERS, '_');

/**
 * The Supabase session, encrypted with an Android Keystore key. Keystore keys are never backed up, so
 * a value that can't be decrypted means a stale copy: it is dropped and the user signs in again.
 */
export function createSecureSessionStorage(store: KeyValueStore): SessionStorage {
  return {
    async getItem(key) {
      try {
        return await store.getItemAsync(safeKey(key));
      } catch {
        await store.deleteItemAsync(safeKey(key));
        return null;
      }
    },
    setItem: (key, value) => store.setItemAsync(safeKey(key), value),
    removeItem: (key) => store.deleteItemAsync(safeKey(key)),
  };
}
