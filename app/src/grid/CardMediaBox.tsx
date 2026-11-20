import { Image } from 'expo-image';
import { View } from 'react-native';
import { useReducedMotion } from 'react-native-reanimated';
import { useFaceDrawn } from '@/hero/HeroFace';
import { Fade } from '@/rewards/Fade';
import type { Swatch } from '@/rooms/roomColours';
import { Icon } from '@/theme/icons/Icon';
import { Paper } from '@/theme/Paper';
import { NoteText } from '@/theme/Text';
import { MOTION } from '@/theme/tokens';
import { thumbJustArrived, type ShownThumb } from './arrival';
import { useArrival, type ArrivalRule } from './useArrival';
import { FETCHING, type CardMedia } from './cardModel';
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
  /** The print's room colour (#85): the box waits on it instead of a dashed outline. */
  readonly swatch?: Swatch | null;
}

/** Plain paper: a dashed outline the thumbnail cross-fades over. */
function DashedWait({ waiting, fading }: { readonly waiting: boolean; readonly fading: boolean }) {
  const styles = useGridStyles();
  return (
    <>
      {waiting ? <View style={styles.dashed} /> : null}
      {fading ? <Fade from={1} to={0} durationMs={MOTION.fillInMs} style={styles.dashed} /> : null}
    </>
  );
}

/**
 * Holds its box at the card's ratio, so nothing moves when the thumbnail lands. Until then the box is dashed, or in a
 * room its colour saying *fetching…* (#85); a thumbnail that lands on screen cross-fades over it (DESIGN.md §7
 * "fetching fills in", #34; reduce motion: at once). A room's colour stays under the picture, so one that fails to
 * load leaves the colour.
 */
export function CardMediaBox({ id, media, playable = false, swatch = null }: CardMediaBoxProps) {
  const styles = useGridStyles();
  const reduceMotion = useReducedMotion();
  const arrived = useArrival({ id, uri: media.uri }, THUMB_RULE);
  const onDisplay = useFaceDrawn();
  const waiting = media.uri === null;
  const fading = arrived && !reduceMotion;
  return (
    <View style={[styles.media, waiting || fading ? styles.mediaWaiting : null, { aspectRatio: 1 / media.ratio }]}>
      {swatch ? (
        <Paper fill={swatch} style={styles.tile}>
          {waiting ? <NoteText>{FETCHING}</NoteText> : null}
        </Paper>
      ) : (
        <DashedWait waiting={waiting} fading={fading} />
      )}
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
