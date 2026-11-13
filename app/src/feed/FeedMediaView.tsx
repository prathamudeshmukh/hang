import { Image } from 'expo-image';
import { View } from 'react-native';
import type { CardMedia } from '@/grid/cardModel';
import { Icon } from '@/theme/icons/Icon';
import { NameText, NoteText } from '@/theme/Text';
import type { FeedPage } from './feedPage';
import { useFeedStyles } from './feedStyles';

const LINES = { title: 6, post: 10, rawUrl: 3 } as const;

function Picture({ id, media, fit, playable }: { readonly id: string; readonly media: CardMedia; readonly fit: 'contain' | 'cover'; readonly playable: boolean }) {
  const styles = useFeedStyles();
  return (
    <View style={[styles.picture, fit === 'contain' && styles.letterbox]}>
      {media.uri ? <Image source={{ uri: media.uri }} recyclingKey={id} style={styles.picture} contentFit={fit} accessible={false} /> : null}
      {playable ? (
        <View style={styles.playDisc}>
          <Icon name="play" />
        </View>
      ) : null}
    </View>
  );
}

function Post({ page }: { readonly page: FeedPage }) {
  const styles = useFeedStyles();
  const { card } = page;
  return (
    <View style={[styles.picture, styles.post]}>
      <View style={styles.postText}>
        <NameText token="post" numberOfLines={LINES.post}>{card.postText ?? card.title ?? card.site}</NameText>
      </View>
      {card.media?.uri ? <Image source={{ uri: card.media.uri }} style={styles.postPicture} contentFit="contain" accessible={false} /> : null}
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

/** The top ~56% of a feed page, by kind (#31). */
export function FeedMediaView({ page, height }: { readonly page: FeedPage; readonly height: number }) {
  const styles = useFeedStyles();
  const { media, card } = page;
  return (
    <View style={[styles.media, { height }]}>
      {media.kind === 'picture' ? <Picture id={card.id} media={media.media} fit={media.fit} playable={media.playable} /> : null}
      {media.kind === 'title' ? (
        <View style={[styles.picture, styles.titleMedia]}>
          <NameText token="display" numberOfLines={LINES.title}>{card.title ?? card.site}</NameText>
        </View>
      ) : null}
      {media.kind === 'post' ? <Post page={page} /> : null}
      {media.kind === 'pending' ? <Pending page={page} /> : null}
    </View>
  );
}
