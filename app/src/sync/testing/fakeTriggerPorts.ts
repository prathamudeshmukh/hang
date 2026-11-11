import { createFakeClock, type FakeClock } from '../../db/testing/testDb.ts';
import type { SyncReport } from '../types.ts';
import type { SyncTriggerPorts, Unsubscribe } from '../syncTriggers.ts';

const REPORT: SyncReport = { pushed: 0, failed: 0, waiting: false, pulled: { collections: 0, items: 0, item_content: 0 } };

interface Timer {
  readonly at: number;
  readonly run: () => void;
  cancelled: boolean;
}

/** A listener slot that records whether anyone is subscribed. */
function createEmitter<T>() {
  let listener: ((value: T) => void) | null = null;
  return {
    subscribe(next: (value: T) => void): Unsubscribe {
      listener = next;
      return () => {
        listener = null;
      };
    },
    emit: (value: T) => listener?.(value),
    get subscribed() {
      return listener !== null;
    },
  };
}

/** Lets awaited promises (a sync) settle before the test looks. */
export const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

export interface FakeTriggerWorld {
  readonly ports: SyncTriggerPorts;
  readonly clock: FakeClock;
  readonly calls: string[];
  readonly logs: string[];
  goForeground(foreground: boolean): void;
  setOnline(online: boolean): void;
  realtimeChange(): void;
  realtimeError(reason: string): void;
  readonly realtimeSubscribed: boolean;
  /** Moves the clock and fires timers that come due, in order. */
  advance(ms: number): Promise<void>;
  /** The head of the outbox waits until this time (null: nothing pending). */
  retryAt(at: number | null): void;
  failNextSync(error: Error): void;
  /** The next sync stays in flight until the returned function is called. */
  holdNextSync(): () => void;
  /** How many times Realtime was opened. */
  readonly realtimeOpens: number;
}

export function createFakeTriggerWorld(options: { readonly foreground?: boolean } = {}): FakeTriggerWorld {
  const clock = createFakeClock();
  const calls: string[] = [];
  const logs: string[] = [];
  const lifecycle = createEmitter<boolean>();
  const network = createEmitter<boolean>();
  const realtime = createEmitter<'change' | string>();
  let realtimeError: ((reason: string) => void) | null = null;
  let foreground = options.foreground ?? true;
  let timers: readonly Timer[] = [];
  let nextRetry: number | null = null;
  let syncFailure: Error | null = null;
  let syncGate: Promise<void> | null = null;
  let realtimeOpens = 0;

  const ports: SyncTriggerPorts = {
    clock,
    lifecycle: { isForeground: () => foreground, onChange: lifecycle.subscribe },
    network: { onChange: network.subscribe },
    realtime: {
      subscribe({ onChange, onError }) {
        realtimeError = onError;
        realtimeOpens += 1;
        return realtime.subscribe(() => onChange());
      },
    },
    timers: {
      setTimeout(run, ms) {
        const timer: Timer = { at: clock.now() + ms, run, cancelled: false };
        timers = [...timers, timer];
        return () => {
          timer.cancelled = true;
        };
      },
    },
    outbox: {
      retryNow: () => {
        calls.push('retryNow');
      },
      nextRetryAt: () => nextRetry,
    },
    sync: async () => {
      calls.push('sync');
      const gate = syncGate;
      syncGate = null;
      if (gate) await gate;
      const failure = syncFailure;
      syncFailure = null;
      if (failure) throw failure;
      return REPORT;
    },
    log: (message) => {
      logs.push(message);
    },
  };

  async function advance(ms: number): Promise<void> {
    const until = clock.now() + ms;
    for (;;) {
      const due = timers.filter((timer) => !timer.cancelled && timer.at <= until).sort((a, b) => a.at - b.at)[0];
      if (!due) break;
      clock.advance(due.at - clock.now());
      due.cancelled = true;
      due.run();
      await settle();
    }
    clock.advance(until - clock.now());
  }

  return {
    ports,
    clock,
    calls,
    logs,
    goForeground(next) {
      foreground = next;
      lifecycle.emit(next);
    },
    setOnline: network.emit,
    realtimeChange: () => realtime.emit('change'),
    realtimeError: (reason) => realtimeError?.(reason),
    get realtimeSubscribed() {
      return realtime.subscribed;
    },
    advance,
    retryAt(at) {
      nextRetry = at;
    },
    failNextSync(error) {
      syncFailure = error;
    },
    holdNextSync() {
      let release = () => {};
      syncGate = new Promise<void>((resolve) => {
        release = resolve;
      });
      return release;
    },
    get realtimeOpens() {
      return realtimeOpens;
    },
  };
}
