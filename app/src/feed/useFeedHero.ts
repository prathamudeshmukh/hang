import { usePreventRemove } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { CardModel } from '@/grid/cardModel';
import { hero, rememberFeedFrame, windowFeedFrame } from '@/hero/appHero';
import type { FeedFrame } from '@/hero/geometry';
import { feedOpacity, feedTextOpacity, feedTrailOpacity } from '@/hero/heroValues';
import { hidesFeedMedia } from '@/hero/trip';

export const reportMediaDrawn = (id: string) => hero.feedDrawn(id);

/**
 * The feed's side of the hero (#32): every way out (back button, gesture, a pop from code) goes through
 * the hero, which flies the page on screen back to its print and then removes the feed itself.
 */
export function useFeedHero() {
  const shown = useRef<CardModel | null>(null);
  const frame = useRef<FeedFrame | null>(null);
  const [guarded, setGuarded] = useState(true);

  usePreventRemove(guarded, ({ repeat }) => {
    const pop = () => {
      setGuarded(false);
      repeat();
    };
    hero.back({ card: shown.current, feed: frame.current ?? windowFeedFrame(), pop });
  });

  const onShown = useCallback((card: CardModel | null) => {
    shown.current = card;
  }, []);
  const onFrame = useCallback((next: FeedFrame) => {
    frame.current = next;
    rememberFeedFrame(next);
  }, []);
  const opacity = useAnimatedStyle(() => ({ opacity: feedOpacity.value }));
  return { onShown, onFrame, opacity };
}

/** The feed's words leave sooner than the feed on the way back (#33). */
export function useFeedTextFade() {
  return useAnimatedStyle(() => ({ opacity: feedTextOpacity.value }));
}

/** A post page's imprint and pills: in behind the words after a flight, out with the text going back (#59). */
export function useFeedTrailFade() {
  return useAnimatedStyle(() => ({ opacity: feedTextOpacity.value * feedTrailOpacity.value }));
}

/** True while the flyer stands in for this page's media on the way back, so it isn't left behind. */
export function useHiddenUnderFlyer(id: string): boolean {
  return useSyncExternalStore(hero.subscribe, () => hidesFeedMedia(hero.trip(), id));
}
