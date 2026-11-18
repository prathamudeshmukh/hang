import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme/theme';
import { SPILL, spillRect } from './spillGeometry';

const FADE_ID = 'spill-fade';
/** Mirrored, so the glow continues the picture's lower edge instead of repeating its top. */
const MIRRORED = [{ scaleY: -1 }] as const;

interface ProjectorSpillProps {
  readonly uri: string;
  readonly pageHeight: number;
  readonly mediaHeight: number;
}

/** The page's own picture, blurred and mirrored, lighting the screen under the media box (#79). Decorative only. */
export function ProjectorSpill({ uri, pageHeight, mediaHeight }: ProjectorSpillProps) {
  const { color } = useTheme();
  const { top, height } = spillRect({ pageHeight, mediaHeight });
  if (height === 0) return null;
  return (
    <View pointerEvents="none" accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.spill, { top, height }]}>
      <Image source={{ uri }} blurRadius={SPILL.blurRadius} contentFit="cover" style={[StyleSheet.absoluteFill, { opacity: SPILL.opacity, transform: MIRRORED }]} />
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={FADE_ID} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.wall} stopOpacity={0} />
            <Stop offset="1" stopColor={color.wall} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${FADE_ID})`} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({ spill: { position: 'absolute', left: 0, right: 0, overflow: 'hidden' } });
