/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createSecureSessionStorage, type KeyValueStore } from './secureSessionStorage.ts';

function memoryStore(initial: Record<string, string> = {}): KeyValueStore & { readonly entries: Map<string, string> } {
  const entries = new Map(Object.entries(initial));
  return {
    entries,
    getItemAsync: async (key) => entries.get(key) ?? null,
    setItemAsync: async (key, value) => {
      entries.set(key, value);
    },
    deleteItemAsync: async (key) => {
      entries.delete(key);
    },
  };
}

describe('secure session storage', () => {
  it('stores and reads back the session', async () => {
    const storage = createSecureSessionStorage(memoryStore());
    await storage.setItem('sb-hang-auth-token', '{"access_token":"a"}');
    assert.equal(await storage.getItem('sb-hang-auth-token'), '{"access_token":"a"}');
  });

  it('treats a value it cannot decrypt (restored without its Keystore key) as no session, and drops it', async () => {
    const store = memoryStore({ 'sb-hang-auth-token': 'ciphertext' });
    const storage = createSecureSessionStorage({
      ...store,
      getItemAsync: async () => {
        throw new Error('Could not decrypt the value');
      },
    });
    assert.equal(await storage.getItem('sb-hang-auth-token'), null);
    assert.equal(store.entries.has('sb-hang-auth-token'), false);
  });

  it('turns supabase key names into ones SecureStore accepts', async () => {
    const store = memoryStore();
    await createSecureSessionStorage(store).setItem('sb-hang auth:token', 'x');
    assert.deepEqual([...store.entries.keys()], ['sb-hang_auth_token']);
  });

  it('removes the session', async () => {
    const store = memoryStore({ 'sb-hang-auth-token': 'x' });
    await createSecureSessionStorage(store).removeItem('sb-hang-auth-token');
    assert.equal(store.entries.size, 0);
  });
});
