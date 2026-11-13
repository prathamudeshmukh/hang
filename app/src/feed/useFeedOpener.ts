import { useCallback, useEffect, useRef } from 'react';
import type { CardModel } from '@/grid/cardModel';
import { hero } from '@/hero/appHero';
import type { Scope } from '@/hero/origins';

/**
 * A tap handler that never changes identity, so memoised cards don't redraw, yet always opens the
 * list as it is on screen now (filter, Shuffle, live updates), flying the tapped print in (#32).
 */
export function useFeedOpener(ids: readonly string[], scope: Scope): (card: CardModel) => void {
  const latest = useRef({ ids, scope });
  useEffect(() => {
    latest.current = { ids, scope };
  });
  return useCallback((card: CardModel) => hero.open({ ids: latest.current.ids, card, scope: latest.current.scope }), []);
}
