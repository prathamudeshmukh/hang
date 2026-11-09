import { useCallback, useEffect } from 'react';
import { BackHandler } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MOTION, SHEET } from './tokens';

const OFFSCREEN = 2000;

/**
 * Sheet slides up on mount; every exit (Save, swipe down, scrim tap, back) slides it out first and
 * then finishes ShareActivity via BackHandler.exitApp() → invokeDefaultOnBackPressed() → finish().
 */
export function useSheetMotion(onDismissToInbox: () => void) {
  const offset = useSharedValue(OFFSCREEN);
  const scrim = useSharedValue(0);

  useEffect(() => {
    offset.set(withTiming(0, { duration: MOTION.sheetInMs, easing: MOTION.easing }));
    scrim.set(withTiming(1, { duration: MOTION.scrimMs }));
  }, [offset, scrim]);

  const close = useCallback(
    (afterClose?: () => void) => {
      const finish = () => {
        afterClose?.();
        BackHandler.exitApp();
      };
      scrim.set(withTiming(0, { duration: MOTION.sheetOutMs }));
      offset.set(
        withTiming(OFFSCREEN, { duration: MOTION.sheetOutMs }, (done) => {
          if (done) scheduleOnRN(finish);
        }),
      );
    },
    [offset, scrim],
  );

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      close(onDismissToInbox);
      return true;
    });
    return () => sub.remove();
  }, [close, onDismissToInbox]);

  const pan = Gesture.Pan()
    .onChange((event) => {
      offset.set(Math.max(0, offset.get() + event.changeY));
    })
    .onEnd((event) => {
      if (offset.get() > SHEET.dismissDistance || event.velocityY > SHEET.dismissVelocity) {
        scheduleOnRN(close, onDismissToInbox);
      } else {
        offset.set(withTiming(0, { duration: MOTION.sheetOutMs, easing: MOTION.easing }));
      }
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: offset.value }] }));
  const scrimStyle = useAnimatedStyle(() => ({ opacity: scrim.value }));

  return { close, pan, sheetStyle, scrimStyle };
}
