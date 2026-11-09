import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useFrameCallback, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Measures UI-thread frames, where Reanimated runs animations. A frame counts as dropped when it
 * takes more than 1.5× the device's best observed interval (so 60/90/120 Hz screens all work).
 * Tap to reset between transitions.
 */
const SLOW_FRAME_FACTOR = 1.5;
const REFRESH_MS = 250;
const MAX_REASONABLE_FRAME_MS = 1000;
const METER_GAP = 12;

interface Reading {
  readonly hz: number;
  readonly frames: number;
  readonly dropped: number;
  readonly worstMs: number;
}

const EMPTY: Reading = { hz: 0, frames: 0, dropped: 0, worstMs: 0 };

export function FrameMeter() {
  const best = useSharedValue(Number.MAX_VALUE);
  const frames = useSharedValue(0);
  const dropped = useSharedValue(0);
  const worst = useSharedValue(0);
  const [reading, setReading] = useState<Reading>(EMPTY);
  const insets = useSafeAreaInsets();

  useFrameCallback(({ timeSincePreviousFrame: interval }) => {
    if (interval === null || interval > MAX_REASONABLE_FRAME_MS) return;
    best.value = Math.min(best.value, interval);
    frames.value += 1;
    if (interval > best.value * SLOW_FRAME_FACTOR) dropped.value += 1;
    worst.value = Math.max(worst.value, interval);
  });

  useEffect(() => {
    const timer = setInterval(() => {
      setReading({
        hz: best.get() === Number.MAX_VALUE ? 0 : Math.round(1000 / best.get()),
        frames: frames.get(),
        dropped: dropped.get(),
        worstMs: Math.round(worst.get()),
      });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [best, frames, dropped, worst]);

  const reset = () => {
    frames.set(0);
    dropped.set(0);
    worst.set(0);
  };

  const pct = reading.frames === 0 ? 0 : (reading.dropped / reading.frames) * 100;
  return (
    <Pressable onPress={reset} style={[styles.box, { bottom: insets.bottom + METER_GAP }]} accessibilityLabel="Frame meter, tap to reset">
      <Text style={styles.text}>
        {reading.hz}Hz · {reading.dropped}/{reading.frames} slow ({pct.toFixed(1)}%) · worst {reading.worstMs}ms
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    zIndex: 100,
    elevation: 100,
  },
  text: { color: '#fff', fontSize: 12, fontVariant: ['tabular-nums'] },
});
