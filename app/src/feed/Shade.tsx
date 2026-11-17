import { StyleSheet, View, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/theme';

const SHADE_OPACITY = 0.55;
const DARK_AT = { top: { from: 0, to: 1 }, bottom: { from: 1, to: 0 } } as const;

interface ShadeProps {
  /** The edge the shade is darkest at. */
  readonly edge: 'top' | 'bottom';
  readonly style?: ViewStyle;
}

/** A gradient from the screen color at one edge to nothing, so light ink stays readable over a white image. */
export function Shade({ edge, style }: ShadeProps) {
  const { color } = useTheme();
  const id = `feed-shade-${edge}`;
  const { from, to } = DARK_AT[edge];
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
            <Stop offset={from} stopColor={color.wall} stopOpacity={SHADE_OPACITY} />
            <Stop offset={to} stopColor={color.wall} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}
