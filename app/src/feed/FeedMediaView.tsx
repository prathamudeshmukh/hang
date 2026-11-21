import { Image } from 'expo-image';
import { View } from 'react-native';
import type { CardMedia } from '@/grid/cardModel';
import type { MediaFit } from '@/hero/geometry';
import { Icon } from '@/theme/icons/Icon';
import { NameText, NoteText } from '@/theme/Text';
import type { FeedPage } from './feedPage';
import { useFeedStyles } from './feedStyles';
import { useHiddenUnderFlyer } from './useFeedHero';

const LINES = { title: 6, rawUrl: 3 } as const;

/** Cropped pictures keep their top, as on the grid, so a flight lands without the crop jumping (#32). */
const TOP_ANCHORED = 'top';

interface PictureProps {
  readonly id: string;
  readonly media: CardMedia;
  readonly playable: boolean;
  readonly fit: MediaFit;
  readonly onDrawn: () => void;
}

/** Where the picture sits: filling the box, or whole at the rect the hero lands on (#95). */
function placeOf(fit: MediaFit) {
  if (fit.fit === 'cover') return { width: '100%', height: '100%' } as const;
  const { x, y, width, height } = fit.rect;
  return { position: 'absolute', left: x, top: y, width, height } as const;
}

function Picture({ id, media, playable, fit, onDrawn }: PictureProps) {
  const styles = useFeedStyles();
  return (
    <View style={styles.picture}>
      {media.uri ? <Image source={{ uri: media.uri }} recyclingKey={id} style={placeOf(fit)} contentFit="cover" contentPosition={TOP_ANCHORED} onDisplay={onDrawn} accessible={false} /> : null}
      {playable ? (
        <View style={styles.playDisc}>
          <Icon name="play" />
        </View>
      ) : null}
    </View>
  );
}

function Pending({ page }: { readonly page: FeedPage }) {
  const styles = useFeedStyles();
  return (
    <View style={styles.pendingFrame}>
      <View style={styles.pending}>
        <NoteText>{page.card.note}</NoteText>
        <NoteText numberOfLines={LINES.rawUrl} style={styles.faded}>{page.card.url}</NoteText>
      </View>
    </View>
  );
}

interface FeedMediaViewProps {
  readonly page: FeedPage;
  readonly height: number;
  /** How a picture sits in the box (#95); the page works it out so its glow agrees. */
  readonly fit: MediaFit;
  /** The media is on screen: its image displayed, or laid out when there's none (#32 settling). */
  readonly onDrawn: (id: string) => void;
}

/** The top ~56% of a feed page, by kind (#31); a post (#59) and an image (#60) have no media box. */
export function FeedMediaView({ page, height, fit, onDrawn }: FeedMediaViewProps) {
  const styles = useFeedStyles();
  const { media, card } = page;
  const drawn = () => onDrawn(card.id);
  const hasImage = media.kind === 'picture' && media.media.uri !== null;
  const hidden = useHiddenUnderFlyer(card.id);
  return (
    <View style={[styles.media, { height }, fit.fit === 'whole' && styles.mediaOpen, hidden && styles.hidden]} onLayout={hasImage ? undefined : drawn}>
      {media.kind === 'picture' ? <Picture id={card.id} media={media.media} playable={media.playable} fit={fit} onDrawn={drawn} /> : null}
      {media.kind === 'title' ? (
        <View style={[styles.picture, styles.titleMedia]}>
          <NameText token="display" numberOfLines={LINES.title}>{card.title ?? card.site}</NameText>
        </View>
      ) : null}
      {media.kind === 'pending' ? <Pending page={page} /> : null}
    </View>
  );
}
