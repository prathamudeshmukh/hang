import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';

const SHADE_ID = 'feed-top-shade';
const SHADE_OPACITY = 0.55;

/** Keeps the light status-bar icons and the counter readable over a white image (#31). */
export function TopShade() {
  const insets = useSafeAreaInsets();
  const { color } = useTheme();
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { height: insets.top + SPACE.touch * 2 }]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={SHADE_ID} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.wall} stopOpacity={SHADE_OPACITY} />
            <Stop offset="1" stopColor={color.wall} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${SHADE_ID})`} />
      </Svg>
    </View>
  );
}
