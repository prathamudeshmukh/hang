import { useCallback, useEffect, useRef } from 'react';
import { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';
import { MOTION } from '@/theme/tokens';
import { chromeHiddenOn } from './imageChrome';
import { useImageViewer, useViewerState } from './imageViewerContext';
import type { ZoomableHandle } from './ZoomableImage';

/** Chrome fades out and in; with reduce motion it just goes (DESIGN.md §7). */
export function useChromeFade(hidden: boolean) {
  const reduceMotion = useReducedMotion();
  return useAnimatedStyle(() => {
    const opacity = hidden ? 0 : 1;
    return { opacity: reduceMotion ? opacity : withTiming(opacity, { duration: MOTION.quickMs }) };
  });
}

/**
 * An image page's side of the feed's viewer (#60): its taps and zoom drive the shared chrome, and while
 * it is zoomed, back asks it to zoom out.
 */
export function useImageChrome(id: string) {
  const viewer = useImageViewer();
  const hidden = chromeHiddenOn(useViewerState(viewer), id);
  const zoomable = useRef<ZoomableHandle>(null);
  const forget = useRef<(() => void) | null>(null);

  const onTap = useCallback(() => viewer.send('tap'), [viewer]);
  const onZoomChange = useCallback((zoomed: boolean) => {
    forget.current?.();
    forget.current = zoomed ? viewer.onZoomOut(() => zoomable.current?.zoomOut()) : null;
    viewer.send(zoomed ? 'zoomedIn' : 'zoomedOut');
  }, [viewer]);
  useEffect(() => () => forget.current?.(), []);

  return { hidden, zoomable, onTap, onZoomChange };
}
