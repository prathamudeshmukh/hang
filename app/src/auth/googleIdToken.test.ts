/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createGoogleIdTokenProvider, type GoogleSignInApi } from './googleIdToken.ts';

const CANCELLED = 'SIGN_IN_CANCELLED';

function provider(signIn: GoogleSignInApi['signIn'], calls: string[] = []) {
  const api: GoogleSignInApi = {
    configure: ({ webClientId }) => {
      calls.push(`configure ${webClientId}`);
    },
    hasPlayServices: async () => true,
    signIn,
    signOut: async () => {
      calls.push('signOut');
    },
  };
  return createGoogleIdTokenProvider({ api, webClientId: 'web-client', cancelledCode: CANCELLED });
}

describe('google ID token provider', () => {
  it('returns the ID token of the chosen account', async () => {
    const result = await provider(async () => ({ type: 'success', data: { idToken: 'jwt' } })).getIdToken();
    assert.deepEqual(result, { kind: 'token', idToken: 'jwt' });
  });

  it('maps a dismissed picker to cancelled, whether returned or thrown', async () => {
    const returned = await provider(async () => ({ type: 'cancelled' })).getIdToken();
    const thrown = await provider(async () => {
      throw Object.assign(new Error('cancelled'), { code: CANCELLED });
    }).getIdToken();
    assert.deepEqual([returned, thrown], [{ kind: 'cancelled' }, { kind: 'cancelled' }]);
  });

  it('fails when Google returns no ID token (wrong client ID)', async () => {
    const result = provider(async () => ({ type: 'success', data: { idToken: null } })).getIdToken();
    await assert.rejects(result, /no ID token/);
  });

  it('passes other errors through', async () => {
    const result = provider(async () => {
      throw Object.assign(new Error('Play services missing'), { code: 'PLAY_SERVICES_NOT_AVAILABLE' });
    }).getIdToken();
    await assert.rejects(result, /Play services missing/);
  });

  it('configures the Web client ID once, and refuses to start without one', () => {
    const calls: string[] = [];
    provider(async () => ({ type: 'cancelled' }), calls);
    assert.deepEqual(calls, ['configure web-client']);
    assert.throws(() => createGoogleIdTokenProvider({ api: {} as GoogleSignInApi, webClientId: '', cancelledCode: CANCELLED }), /not set/);
  });
});
