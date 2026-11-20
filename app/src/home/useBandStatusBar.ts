import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { StatusBarStyle } from 'expo-status-bar';
import { PAPER_INK } from '@/theme/tokens';

interface BandStatusBar {
  readonly style: StatusBarStyle;
  readonly onBandLayout: (event: LayoutChangeEvent) => void;
  readonly onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

/**
 * The status bar's icons over a painted header (#85): the header's ink while the band is under them, the theme's
 * own once it has scrolled past. `ink` is null with no band (the Inbox). Only the crossing re-renders, not each frame.
 */
export function useBandStatusBar(ink: string | null, topInset: number): BandStatusBar {
  const bandHeight = useRef(0);
  const [pastBand, setPastBand] = useState(false);
  const onBandLayout = useCallback((event: LayoutChangeEvent) => {
    bandHeight.current = event.nativeEvent.layout.height;
  }, []);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => setPastBand(event.nativeEvent.contentOffset.y >= bandHeight.current - topInset),
    [topInset],
  );
  const bandStyle: StatusBarStyle = ink === PAPER_INK.light ? 'light' : 'dark';
  return { style: ink !== null && !pastBand ? bandStyle : 'auto', onBandLayout, onScroll };
}
