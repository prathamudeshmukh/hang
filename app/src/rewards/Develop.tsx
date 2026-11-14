import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { Easing, interpolate, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { MOTION } from '@/theme/tokens';
import type { RediscoverEntry } from './rediscoverEntry';

const [X1, Y1, X2, Y2] = MOTION.easing;
const { develop } = MOTION;
const LATENT = 0;
const DEVELOPED = 1;
const SHARP = 0;
const TRUE_LIGHT = 1;

interface DevelopProps {
  readonly entry: RediscoverEntry;
  readonly style?: StyleProp<ViewStyle>;
  readonly children: ReactNode;
}

/** A print coming up like a photograph: blur, grey and overexposure clear together (DESIGN.md §7). */
export function Develop({ entry, style, children }: DevelopProps) {
  const progress = useSharedValue(entry === 'develop' ? LATENT : DEVELOPED);
  useEffect(() => {
    if (entry !== 'develop') return;
    progress.set(withTiming(DEVELOPED, { duration: develop.durationMs, easing: Easing.bezier(X1, Y1, X2, Y2) }));
  }, [entry, progress]);
  const look = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      filter: [
        { blur: interpolate(p, [LATENT, DEVELOPED], [develop.blur, SHARP]) },
        { saturate: p },
        { brightness: interpolate(p, [LATENT, DEVELOPED], [develop.brightness, TRUE_LIGHT]) },
      ],
    };
  });
  return <Animated.View style={[style, look]}>{children}</Animated.View>;
}
