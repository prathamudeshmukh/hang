import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import type { RoomColours } from '@/rooms/roomColours';
import { Paper } from '@/theme/Paper';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { countInWords } from './homeCopy';
import type { CollectionRow } from './homeLists';
import { useHomeStyles } from './homeStyles';
import { NewCollectionRow } from './NewCollectionRow';

/** The newest picture framed in the room's colour; a room without one is filled with the colour (#85). */
function Cover({ uri, colours }: { readonly uri: string | null; readonly colours: RoomColours }) {
  const styles = useHomeStyles();
  const room = colours[useTheme().scheme];
  if (!uri) return <Paper fill={room.fill} style={styles.cover} />;
  return (
    <View style={[styles.coverFrame, { backgroundColor: room.colour }]}>
      <Image source={{ uri }} style={styles.framedCover} contentFit="cover" accessible={false} />
    </View>
  );
}

function CollectionLink({ collection }: { readonly collection: CollectionRow }) {
  const styles = useHomeStyles();
  const { color } = useTheme();
  return (
    <Link href={{ pathname: '/collection/[id]', params: { id: collection.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${collection.name}, ${collection.count}`} android_ripple={{ color: color.ripple }} style={styles.collectionRow}>
        <Cover uri={collection.coverUri} colours={collection.colours} />
        <NameText token="titleS" numberOfLines={1} style={styles.collectionName}>{collection.name}</NameText>
        <NoteText>{String(collection.count)}</NoteText>
      </Pressable>
    </Link>
  );
}

export function CollectionList({ collections }: { readonly collections: readonly CollectionRow[] }) {
  const styles = useHomeStyles();
  return (
    <>
      <View style={styles.sectionLabel}>
        <NameText token="titleS">Collections</NameText>
        {collections.length > 0 ? <NoteText>{countInWords(collections.length)}</NoteText> : null}
      </View>
      {collections.map((collection) => <CollectionLink key={collection.id} collection={collection} />)}
      <NewCollectionRow />
    </>
  );
}
