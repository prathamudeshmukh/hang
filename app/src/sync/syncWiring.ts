import NetInfo from '@react-native-community/netinfo';
import { AppState } from 'react-native';
import { authSession, supabase } from '@/auth/appSession';
import { db } from '@/db/client';
import { createOutboxRepository } from '@/db/outboxRepository';
import { systemClock } from '@/db/types';
import { isOnline } from './networkState';
import { createItemsRealtime } from './realtimeItems';
import { createSyncTriggers } from './syncTriggers';

const isActive = (state: string | null | undefined) => state === 'active';

/** The main app's sync triggers, on the real AppState, NetInfo and Supabase Realtime. Never imported by the share sheet. */
const log = (message: string) => console.warn(`[sync] ${message}`);

export const syncTriggers = createSyncTriggers({
  clock: systemClock,
  lifecycle: {
    isForeground: () => isActive(AppState.currentState),
    onChange(listener) {
      const subscription = AppState.addEventListener('change', (state) => listener(isActive(state)));
      return () => subscription.remove();
    },
  },
  network: { onChange: (listener) => NetInfo.addEventListener((state) => listener(isOnline(state))) },
  realtime: createItemsRealtime({ client: supabase, log }),
  timers: {
    setTimeout(run, ms) {
      const handle = setTimeout(run, ms);
      return () => clearTimeout(handle);
    },
  },
  outbox: createOutboxRepository({ db, clock: systemClock }),
  sync: authSession.sync,
  log,
});
