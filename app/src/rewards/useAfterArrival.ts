import { useNavigation } from 'expo-router';
import type { NativeStackNavigationProp } from 'expo-router/native-stack';
import type { ParamListBase } from 'expo-router/react-navigation';
import { useEffect } from 'react';

/** A screen restored or opened without a push gets no `transitionEnd`; this starts it anyway. */
const ARRIVAL_FALLBACK_MS = 700;

/** Runs `start` (keep it stable) once the push onto this screen has settled, so a reward isn't spent under the slide (#34). */
export function useAfterArrival(enabled: boolean, start: () => void): void {
  const navigation = useNavigation<NativeStackNavigationProp<ParamListBase>>();
  useEffect(() => {
    if (!enabled) return undefined;
    const started = { done: false };
    const once = () => {
      if (started.done) return;
      started.done = true;
      start();
    };
    const unsubscribe = navigation.addListener('transitionEnd', ({ data }) => {
      if (!data.closing) once();
    });
    const fallback = setTimeout(once, ARRIVAL_FALLBACK_MS);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
  }, [enabled, navigation, start]);
}
