import Animated from 'react-native-reanimated';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SPACE } from '@/theme/tokens';
import { useChromeFade } from './image/useImageChrome';
import { Shade } from './Shade';

/** Keeps the light status-bar icons and the counter readable over a white image (#31); goes with the chrome (#60). */
export function TopShade({ hidden }: { readonly hidden: boolean }) {
  const insets = useSafeAreaInsets();
  const fade = useChromeFade(hidden);
  return (
    <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: insets.top + SPACE.touch * 2 }, fade]}>
      <Shade edge="top" />
    </Animated.View>
  );
}
