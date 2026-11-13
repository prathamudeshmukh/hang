import { usePreventRemove } from 'expo-router';
import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { Dimensions } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { CardModel } from '@/grid/cardModel';
import { hero, rememberFeedSize } from '@/hero/appHero';
import type { Size } from '@/hero/geometry';
import { feedOpacity, feedTextOpacity } from '@/hero/heroValues';
import { hidesFeedMedia } from '@/hero/trip';

export const reportMediaDrawn = (id: string) => hero.feedDrawn(id);

/**
 * The feed's side of the hero (#32): every way out (back button, gesture, a pop from code) goes through
 * the hero, which flies the page on screen back to its print and then removes the feed itself.
 */
export function useFeedHero() {
  const shown = useRef<CardModel | null>(null);
  const size = useRef<Size | null>(null);
  const [guarded, setGuarded] = useState(true);

  usePreventRemove(guarded, ({ repeat }) => {
    const pop = () => {
      setGuarded(false);
      repeat();
    };
    hero.back({ card: shown.current, feed: size.current ?? Dimensions.get('window'), pop });
  });

  const onShown = useCallback((card: CardModel | null) => {
    shown.current = card;
  }, []);
  const onSize = useCallback((next: Size) => {
    size.current = next;
    rememberFeedSize(next);
  }, []);
  const opacity = useAnimatedStyle(() => ({ opacity: feedOpacity.value }));
  return { onShown, onSize, opacity };
}

/** The feed's words leave sooner than the feed on the way back (#33). */
export function useFeedTextFade() {
  return useAnimatedStyle(() => ({ opacity: feedTextOpacity.value }));
}

/** True while the flyer stands in for this page's media on the way back, so it isn't left behind. */
export function useHiddenUnderFlyer(id: string): boolean {
  return useSyncExternalStore(hero.subscribe, () => hidesFeedMedia(hero.trip(), id));
}
