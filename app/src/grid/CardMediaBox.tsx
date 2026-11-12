import { Image } from 'expo-image';
import { useState } from 'react';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { Icon } from '@/theme/icons/Icon';
import { MOTION } from '@/theme/tokens';
import { thumbJustArrived, type ShownThumb } from './arrival';
import type { CardMedia } from './cardModel';
import { useGridStyles } from './gridStyles';

/** Tall images keep their top (a screenshot's header); wide ones crop evenly. */
const TOP_ANCHORED = 'top';

interface Seen {
  readonly shown: ShownThumb;
  readonly arrived: boolean;
}

/** Fade only for a thumbnail that lands while the card is showing (reduce motion: never). */
function useArrivalFade(shown: ShownThumb): number | null {
  const reduceMotion = useReducedMotion();
  const [seen, setSeen] = useState<Seen | null>(null);
  const changed = seen === null || seen.shown.id !== shown.id || seen.shown.uri !== shown.uri;
  if (changed) setSeen({ shown, arrived: thumbJustArrived(seen?.shown ?? null, shown) });
  const arrived = changed ? thumbJustArrived(seen?.shown ?? null, shown) : seen.arrived;
  return arrived && !reduceMotion ? MOTION.quickMs : null;
}

interface CardMediaBoxProps {
  readonly id: string;
  readonly media: CardMedia;
  readonly playable?: boolean;
}

/** Holds its box at the card's ratio, so nothing moves when the thumbnail lands. */
export function CardMediaBox({ id, media, playable = false }: CardMediaBoxProps) {
  const styles = useGridStyles();
  const transition = useArrivalFade({ id, uri: media.uri });
  return (
    <View style={[styles.media, { aspectRatio: 1 / media.ratio }]}>
      {media.uri ? (
        <Image
          source={{ uri: media.uri }}
          recyclingKey={id}
          style={styles.image}
          contentFit="cover"
          contentPosition={TOP_ANCHORED}
          transition={transition}
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
