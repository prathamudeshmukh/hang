import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MOTION } from '@/theme/tokens';

const [X1, Y1, X2, Y2] = MOTION.easing;
interface FadeProps {
  /** Opacity on the first frame. */
  readonly from: number;
  readonly to: number;
  readonly durationMs: number;
  readonly style?: StyleProp<ViewStyle>;
  readonly children?: ReactNode;
}

/** Mounts at `from` and settles at `to`; remount it (a new `key`) to play it again. */
export function Fade({ from, to, durationMs, style, children }: FadeProps) {
  const opacity = useSharedValue(from);
  useEffect(() => {
    opacity.set(withTiming(to, { duration: durationMs, easing: Easing.bezier(X1, Y1, X2, Y2) }));
  }, [opacity, to, durationMs]);
  const look = useAnimatedStyle(() => ({ opacity: opacity.get() }));
  return <Animated.View style={[style, look]}>{children}</Animated.View>;
}
