import { useState } from 'react';

interface Seen<T> {
  readonly shown: T;
  readonly arrived: boolean;
}

export interface ArrivalRule<T> {
  /** True for the change a reward celebrates (pure; see `arrival.ts`). */
  readonly justArrived: (previous: T | null, next: T) => boolean;
  /** Whether two renders show the same thing, so nothing changed. */
  readonly same: (a: T, b: T) => boolean;
}

/**
 * Whether what this cell shows just arrived while it was on screen. It stays true until the cell shows
 * something else, so a redraw mid-reward doesn't cut it short.
 */
export function useArrival<T>(shown: T, { justArrived, same }: ArrivalRule<T>): boolean {
  const [seen, setSeen] = useState<Seen<T> | null>(null);
  const changed = seen === null || !same(seen.shown, shown);
  const arrived = changed ? justArrived(seen?.shown ?? null, shown) : seen.arrived;
  if (changed) setSeen({ shown, arrived });
  return arrived;
}
