import { useCallback, useEffect, useRef } from 'react';
import { openFeed } from './appFeed';

/**
 * A tap handler that never changes identity, so memoised cards don't redraw, yet always opens the
 * list as it is on screen now (filter, Shuffle, live updates).
 */
export function useFeedOpener(ids: readonly string[]): (start: string) => void {
  const latest = useRef(ids);
  useEffect(() => {
    latest.current = ids;
  });
  return useCallback((start: string) => openFeed(latest.current, start), []);
}
