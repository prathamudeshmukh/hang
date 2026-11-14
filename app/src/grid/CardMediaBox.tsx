import { Image } from 'expo-image';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useFaceDrawn } from '@/hero/HeroFace';
import { Fade } from '@/rewards/Fade';
import { Icon } from '@/theme/icons/Icon';
import { MOTION } from '@/theme/tokens';
import { thumbJustArrived, type ShownThumb } from './arrival';
import { useArrival, type ArrivalRule } from './useArrival';
import type { CardMedia } from './cardModel';
import { useGridStyles } from './gridStyles';

/** Tall images keep their top (a screenshot's header); wide ones crop evenly. */
const TOP_ANCHORED = 'top';

const THUMB_RULE: ArrivalRule<ShownThumb> = {
  justArrived: thumbJustArrived,
  same: (a, b) => a.id === b.id && a.uri === b.uri,
};

interface CardMediaBoxProps {
  readonly id: string;
  readonly media: CardMedia;
  readonly playable?: boolean;
}

/**
 * Holds its box at the card's ratio, so nothing moves when the thumbnail lands. Until then the box is dashed; a
 * thumbnail that lands on screen cross-fades over it (DESIGN.md §7 "fetching fills in", #34; reduce motion: at once).
 */
export function CardMediaBox({ id, media, playable = false }: CardMediaBoxProps) {
  const styles = useGridStyles();
  const reduceMotion = useReducedMotion();
  const arrived = useArrival({ id, uri: media.uri }, THUMB_RULE);
  const onDisplay = useFaceDrawn();
  const waiting = media.uri === null;
  const fading = arrived && !reduceMotion;
  return (
    <View style={[styles.media, waiting || fading ? styles.mediaWaiting : null, { aspectRatio: 1 / media.ratio }]}>
      {waiting ? <View style={styles.dashed} /> : null}
      {fading ? <Fade from={1} to={0} durationMs={MOTION.fillInMs} style={styles.dashed} /> : null}
      {media.uri ? (
        <Image
          source={{ uri: media.uri }}
          recyclingKey={id}
          style={styles.image}
          contentFit="cover"
          contentPosition={TOP_ANCHORED}
          transition={fading ? MOTION.fillInMs : null}
          onDisplay={onDisplay}
          accessible={false}
        />
      ) : null}
      {playable ? (
        <View style={styles.playDisc}>
          <Icon name="play" color="screenInk" />
        </View>
      ) : null}
    </View>
  );
}
