import { useSyncExternalStore } from 'react';
import { authSession } from './appSession';
import type { AuthSnapshot } from './types';

export function useAuth(): AuthSnapshot {
  return useSyncExternalStore(authSession.subscribe, authSession.getSnapshot);
}
