import type { Clock } from '../db/types.ts';
import type { SyncReport } from './types.ts';

export type Unsubscribe = () => void;
export type CancelTimer = () => void;

export interface SyncTriggerPorts {
  readonly clock: Clock;
  readonly lifecycle: {
    isForeground(): boolean;
    onChange(listener: (foreground: boolean) => void): Unsubscribe;
  };
  /** Reports the current state once on subscribing, then every change. */
  readonly network: { onChange(listener: (online: boolean) => void): Unsubscribe };
  /** Changes to the user's `items` rows. Only a signal: the payload is never read. */
  readonly realtime: {
    subscribe(handlers: { readonly onChange: () => void; readonly onError: (reason: string) => void }): Unsubscribe;
  };
  readonly timers: { setTimeout(run: () => void, ms: number): CancelTimer };
  readonly outbox: { retryNow(): void; nextRetryAt(): number | null };
  /** Expected never to throw (authSession.sync); a throw is logged anyway. */
  readonly sync: () => Promise<SyncReport | null>;
  /** Warnings only; never given a URL. */
  readonly log: (message: string) => void;
}

export const SYNC_TRIGGER_TIMING = {
  /** Switching back to Hang several times a minute shouldn't sync each time. */
  foregroundMinGapMs: 30_000,
  /** Folds a burst of changes (including the echo of our own pushes) into one sync. */
  realtimeDebounceMs: 1_000,
} as const;

/**
 * When to sync while the main app is signed in (PHASE1, slice 7): on return to the foreground (at most
 * every 30 s), when the connection comes back and on pull-to-refresh (both skip the backoff wait), on a
 * Realtime change (debounced), and when the head of the outbox may be retried. Realtime and the retry
 * timer only run in the foreground; a write made in the app itself calls `syncNow`. The share sheet never starts this.
 */
export function createSyncTriggers(ports: SyncTriggerPorts, timing = SYNC_TRIGGER_TIMING) {
  const { clock, timers } = ports;
  let running = false;
  let lastSyncAt = 0;
  let online: boolean | null = null;
  let listeners: readonly Unsubscribe[] = [];
  let closeRealtime: Unsubscribe | null = null;
  let cancelDebounce: CancelTimer | null = null;
  let cancelRetry: CancelTimer | null = null;

  async function runSync(): Promise<void> {
    lastSyncAt = clock.now();
    try {
      await ports.sync();
    } catch (error) {
      ports.log(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    scheduleRetry();
  }

  function scheduleRetry(): void {
    cancelRetry?.();
    cancelRetry = null;
    const at = ports.outbox.nextRetryAt();
    if (!running || !ports.lifecycle.isForeground() || at === null || at <= clock.now()) return;
    cancelRetry = timers.setTimeout(() => void runSync(), at - clock.now());
  }

  function onRealtimeChange(): void {
    cancelDebounce?.();
    cancelDebounce = timers.setTimeout(() => void runSync(), timing.realtimeDebounceMs);
  }

  function onRealtimeError(reason: string): void {
    ports.log(`Realtime channel ${reason}; syncing on the other triggers until the next foreground`);
    closeRealtime?.();
    closeRealtime = null;
  }

  function enterForeground(): void {
    closeRealtime ??= ports.realtime.subscribe({ onChange: onRealtimeChange, onError: onRealtimeError });
    scheduleRetry();
  }

  function leaveForeground(): void {
    [closeRealtime, cancelDebounce, cancelRetry].forEach((close) => close?.());
    closeRealtime = cancelDebounce = cancelRetry = null;
  }

  function onLifecycle(foreground: boolean): void {
    if (!foreground) return leaveForeground();
    if (clock.now() - lastSyncAt >= timing.foregroundMinGapMs) void runSync();
    enterForeground();
  }

  /** Also reopens Realtime closed by a channel error (a dropped socket reports one); once per reconnect, not a loop. */
  function onNetwork(nowOnline: boolean): void {
    const regained = online === false && nowOnline;
    online = nowOnline;
    if (!regained) return;
    void refresh();
    if (ports.lifecycle.isForeground()) enterForeground();
  }

  /** Pull-to-refresh and reconnect: the user (or the network) says now, so the backoff doesn't apply. */
  async function refresh(): Promise<void> {
    ports.outbox.retryNow();
    await runSync();
  }

  return {
    /** Call once signed in; the sign-in already synced, so this doesn't. */
    start(): void {
      if (running) return;
      running = true;
      lastSyncAt = clock.now();
      listeners = [ports.lifecycle.onChange(onLifecycle), ports.network.onChange(onNetwork)];
      if (ports.lifecycle.isForeground()) enterForeground();
    },

    stop(): void {
      running = false;
      listeners.forEach((unsubscribe) => unsubscribe());
      listeners = [];
      online = null;
      leaveForeground();
    },

    refresh,

    /** A local write the server should see soon (a new collection); the backoff still applies. */
    syncNow: runSync,
  };
}

export type SyncTriggers = ReturnType<typeof createSyncTriggers>;
