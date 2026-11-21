import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { countInWords } from './homeCopy';
import type { CollectionRow } from './homeLists';
import { roomMosaic } from './roomMosaic';
import { RoomMosaicView } from './RoomMosaicView';
import { useRoomTileStyles } from './roomTileStyles';

interface RoomTileProps {
  readonly collection: CollectionRow;
  readonly width: number;
}

/** "Fun, two things": a screen reader hears what the count counts. */
const labelOf = ({ name, count }: CollectionRow) => `${name}, ${countInWords(count)} ${count === 1 ? 'thing' : 'things'}`;

/** A room on Home (#106): its mosaic, labelled under it like a work on a gallery wall. */
export function RoomTile({ collection, width }: RoomTileProps) {
  const styles = useRoomTileStyles();
  const { color } = useTheme();
  return (
    <Link href={{ pathname: '/collection/[id]', params: { id: collection.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={labelOf(collection)} android_ripple={{ color: color.ripple, foreground: true }} style={{ width }}>
        <RoomMosaicView mosaic={roomMosaic(collection)} colours={collection.colours} />
        <View style={styles.label}>
          <NameText token="titleS" numberOfLines={1} style={styles.name}>{collection.name}</NameText>
          <NoteText>{String(collection.count)}</NoteText>
        </View>
      </Pressable>
    </Link>
  );
}
