import { Image } from 'expo-image';
import { View } from 'react-native';
import type { CardMedia } from '@/grid/cardModel';
import type { Box } from './postLayout';
import { usePostStyles } from './postStyles';

/** The picture that answers the words, at its own shape, left-aligned (DESIGN.md §8). Taps arrive with #60. */
export function PostPicture({ id, media, box }: { readonly id: string; readonly media: CardMedia; readonly box: Box }) {
  const styles = usePostStyles();
  return (
    <View style={[styles.picture, box]}>
      {media.uri ? <Image source={{ uri: media.uri }} recyclingKey={id} style={styles.fill} contentFit="cover" accessible={false} /> : null}
    </View>
  );
}
