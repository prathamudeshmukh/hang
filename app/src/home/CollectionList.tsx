import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { Pressable, View } from 'react-native';
import { Paper } from '@/theme/Paper';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { collectionCover } from './collectionCover';
import { countInWords } from './homeCopy';
import type { CollectionRow } from './homeLists';
import { useHomeStyles } from './homeStyles';
import { NewCollectionRow } from './NewCollectionRow';

/** The newest picture, unframed (#85); else its colour, its initial on paper, or bare paper when empty (#96). */
function Cover({ collection }: { readonly collection: CollectionRow }) {
  const styles = useHomeStyles();
  const { scheme } = useTheme();
  const cover = collectionCover(collection);
  if (cover.kind === 'picture') return <Image source={{ uri: cover.uri }} style={styles.cover} contentFit="cover" accessible={false} />;
  if (cover.kind === 'colour') return <Paper fill={cover.colours[scheme].fill} style={styles.cover} />;
  if (cover.kind === 'empty') return <View style={styles.cover} />;
  return (
    <View style={[styles.cover, styles.coverInitial]}>
      <NameText token="titleS" accessible={false}>{cover.letter}</NameText>
    </View>
  );
}

function CollectionLink({ collection }: { readonly collection: CollectionRow }) {
  const styles = useHomeStyles();
  const { color } = useTheme();
  return (
    <Link href={{ pathname: '/collection/[id]', params: { id: collection.id } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`${collection.name}, ${collection.count}`} android_ripple={{ color: color.ripple }} style={styles.collectionRow}>
        <Cover collection={collection} />
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
