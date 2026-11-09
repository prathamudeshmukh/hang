import { useCallback } from 'react';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MOTION } from '../tokens';

export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface Backdrop {
  /** 1 = screening room (feed), 0 = wall. */
  readonly dark: number;
  /** 1 = reader paper over everything. */
  readonly paper: number;
}

/** Anything with measureInWindow: a host view ref (RN 0.88 types View as a function component). */
export interface Measurable {
  measureInWindow(callback: (x: number, y: number, width: number, height: number) => void): void;
}

const ZERO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };

export function measure(view: Measurable | null): Promise<Rect> {
  return new Promise((resolve) => {
    if (!view) return resolve(ZERO_RECT);
    view.measureInWindow((x, y, width, height) => resolve({ x, y, width, height }));
  });
}

/**
 * Animates one "print" between two window rects while cross-fading the backdrops.
 * Everything runs on the UI thread; JS is only told when the flight lands.
 */
export function useFlight() {
  const from = useSharedValue<Rect>(ZERO_RECT);
  const to = useSharedValue<Rect>(ZERO_RECT);
  const progress = useSharedValue(1);
  const dark = useSharedValue(0);
  const paper = useSharedValue(0);

  /** Parks the flyer at the start of the route without moving it (it may not be drawn yet). */
  const prepare = useCallback(
    (route: { from: Rect; to: Rect }) => {
      from.set(route.from);
      to.set(route.to);
      progress.set(0);
    },
    [from, to, progress],
  );

  const launch = useCallback(
    (backdrop: Backdrop, onLanded: () => void) => {
      const timing = { duration: MOTION.baseMs, easing: MOTION.easing };
      dark.set(withTiming(backdrop.dark, timing));
      paper.set(withTiming(backdrop.paper, timing));
      progress.set(
        withTiming(1, timing, (finished) => {
          if (finished) scheduleOnRN(onLanded);
        }),
      );
    },
    [progress, dark, paper],
  );

  const flyerStyle = useAnimatedStyle(() => {
    const t = progress.value;
    const lerp = (a: number, b: number) => a + (b - a) * t;
    return {
      position: 'absolute',
      left: lerp(from.value.x, to.value.x),
      top: lerp(from.value.y, to.value.y),
      width: lerp(from.value.width, to.value.width),
      height: lerp(from.value.height, to.value.height),
    };
  });
  const darkStyle = useAnimatedStyle(() => ({ opacity: dark.value }));
  const paperStyle = useAnimatedStyle(() => ({ opacity: paper.value }));

  return { prepare, launch, flyerStyle, darkStyle, paperStyle };
}
