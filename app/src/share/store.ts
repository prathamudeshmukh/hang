import type { ParsedShare } from './parseShare';

/**
 * In-memory log of received shares, shared by MainActivity and ShareActivity because both run on
 * the same React host / JS runtime. Lost when the process dies; the real app writes to SQLite.
 */
export interface ReceivedShare {
  readonly share: ParsedShare;
  readonly collection: string | null; // null = left in Inbox
  readonly openMs: number;
  readonly coldStart: boolean;
  readonly receivedAt: number;
}

/** When this JS runtime started. A share opened before this needed a cold JS boot. */
export const JS_BOOTED_AT = Date.now();

type Listener = (shares: readonly ReceivedShare[]) => void;

let shares: readonly ReceivedShare[] = [];
const listeners = new Set<Listener>();

export function recordShare(entry: ReceivedShare): void {
  shares = [entry, ...shares];
  listeners.forEach((listener) => listener(shares));
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(shares);
  return () => {
    listeners.delete(listener);
  };
}
