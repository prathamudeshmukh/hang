import { useCallback } from 'react';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { makeStyles } from '@/theme/theme';
import { MOTION, STROKE } from '@/theme/tokens';
import type { RoomEntry } from './roomEntry';
import { useAfterArrival } from './useAfterArrival';

const [X1, Y1, X2, Y2] = MOTION.easing;
const DRAW = { duration: MOTION.slowMs, easing: Easing.bezier(X1, Y1, X2, Y2) };
const DRAWN = 1;
const UNDRAWN = 0;

const useStyles = makeStyles(({ color }) => ({
  line: { height: STROKE.underline, backgroundColor: color.ink, transformOrigin: 'left' },
}));

/** The ink line under a collection's title, drawn left to right on arrival (DESIGN.md §7). */
export function RoomUnderline({ entry }: { readonly entry: RoomEntry }) {
  const styles = useStyles();
  const progress = useSharedValue(entry === 'draw' ? UNDRAWN : DRAWN);
  const draw = useCallback(() => progress.set(withTiming(DRAWN, DRAW)), [progress]);
  useAfterArrival(entry === 'draw', draw);
  const drawing = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.get() }] }));
  if (entry === 'none') return null;
  return <Animated.View style={[styles.line, drawing]} accessible={false} />;
}
