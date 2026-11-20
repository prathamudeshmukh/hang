import { useId, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { paperTheme, ThemeOverride } from './theme';

/** A room colour as drawn (#85): a gradient from `top` to `end`, written on in `ink`. */
export interface PaperFill {
  readonly top: string;
  readonly end: string;
  readonly ink: string;
}

interface PaperProps {
  readonly fill: PaperFill;
  readonly style?: StyleProp<ViewStyle>;
  readonly children?: ReactNode;
}

/** The gradient runs top-left to bottom-right, like light falling across a print. */
const DIAGONAL = { x1: '0', y1: '0', x2: '0.3', y2: '1' } as const;

/** A room-coloured print: everything inside draws in the fill's ink (text, icons, ripple). */
export function Paper({ fill, style, children }: PaperProps) {
  const id = `paper-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  return (
    <View style={[styles.paper, style, styles.clear]}>
      {/* Like Shade: an Svg sizes itself from its width and height, so it fills an absolutely placed View. */}
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id={id} {...DIAGONAL}>
              <Stop offset={0} stopColor={fill.top} />
              <Stop offset={1} stopColor={fill.end} />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill={`url(#${id})`} />
        </Svg>
      </View>
      <ThemeOverride.Provider value={paperTheme(fill.ink)}>{children}</ThemeOverride.Provider>
    </View>
  );
}

/** `clear` comes last: a print's own style may carry the plain `raised` paper this replaces. */
const styles = StyleSheet.create({ paper: { overflow: 'hidden' }, clear: { backgroundColor: 'transparent' } });
