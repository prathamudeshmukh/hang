import { Image } from 'expo-image';
import { View } from 'react-native';
import type { CardMedia } from '@/grid/cardModel';
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
  readonly onDrawn: () => void;
}

function Picture({ id, media, playable, onDrawn }: PictureProps) {
  const styles = useFeedStyles();
  return (
    <View style={styles.picture}>
      {media.uri ? <Image source={{ uri: media.uri }} recyclingKey={id} style={styles.picture} contentFit="cover" contentPosition={TOP_ANCHORED} onDisplay={onDrawn} accessible={false} /> : null}
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
  /** The media is on screen: its image displayed, or laid out when there's none (#32 settling). */
  readonly onDrawn: (id: string) => void;
}

/** The top ~56% of a feed page, by kind (#31); a post (#59) and an image (#60) have no media box. */
export function FeedMediaView({ page, height, onDrawn }: FeedMediaViewProps) {
  const styles = useFeedStyles();
  const { media, card } = page;
  const drawn = () => onDrawn(card.id);
  const hasImage = media.kind === 'picture' && media.media.uri !== null;
  const hidden = useHiddenUnderFlyer(card.id);
  return (
    <View style={[styles.media, { height }, hidden && styles.hidden]} onLayout={hasImage ? undefined : drawn}>
      {media.kind === 'picture' ? <Picture id={card.id} media={media.media} playable={media.playable} onDrawn={drawn} /> : null}
      {media.kind === 'title' ? (
        <View style={[styles.picture, styles.titleMedia]}>
          <NameText token="display" numberOfLines={LINES.title}>{card.title ?? card.site}</NameText>
        </View>
      ) : null}
      {media.kind === 'pending' ? <Pending page={page} /> : null}
    </View>
  );
}
