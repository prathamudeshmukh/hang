import { usePreventRemove } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Dimensions } from 'react-native';
import { useAnimatedStyle } from 'react-native-reanimated';
import type { CardModel } from '@/grid/cardModel';
import { hero, rememberFeedSize } from '@/hero/appHero';
import type { Size } from '@/hero/geometry';
import { feedOpacity } from '@/hero/heroValues';

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
