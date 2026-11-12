import { FlashList } from '@shopify/flash-list';
import { RefreshControl, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/grid/Card';
import { thingsCount } from '@/grid/catalogueNote';
import { columnsFor } from '@/grid/columns';
import { useGridStyles } from '@/grid/gridStyles';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { appListSources } from './appListSources';
import { readPlace, type Place, type PlaceList } from './homeLists';
import { SyncProblem } from './SyncProblem';
import { useLiveQuery } from './useLiveQuery';
import { useRefresh } from './useRefresh';

const placeKey = (place: Place) => (place.kind === 'inbox' ? 'inbox' : `collection:${place.id}`);
const EMPTY_WALL = 'An empty wall. Share anything from another app to hang it here.';
const GONE = 'This collection isn’t on this device any more.';

function PlaceHeader({ list }: { readonly list: PlaceList | null }) {
  const styles = useGridStyles();
  return (
    <View style={styles.header}>
      <NameText token="display">{list?.title ?? 'Gone'}</NameText>
      {list && list.cards.length > 0 ? <NoteText>{thingsCount(list.cards.length)}</NoteText> : null}
      <SyncProblem />
      {list?.cards.length === 0 ? <NoteText>{EMPTY_WALL}</NoteText> : null}
      {list ? null : <NoteText>{GONE}</NoteText>}
    </View>
  );
}

/** The Inbox or one collection as a masonry wall, newest first (DESIGN.md §8). */
export function PlaceScreen({ place }: { readonly place: Place }) {
  const insets = useSafeAreaInsets();
  const styles = useGridStyles();
  const { color } = useTheme();
  const { fontScale } = useWindowDimensions();
  const list = useLiveQuery(() => readPlace(appListSources, place), placeKey(place));
  const { refreshing, onRefresh } = useRefresh();
  const columns = columnsFor(fontScale);

  return (
    <FlashList
      key={columns}
      masonry
      numColumns={columns}
      style={styles.wall}
      contentContainerStyle={{ ...styles.content, paddingTop: insets.top + SPACE.screenTop, paddingBottom: insets.bottom + SPACE.screenBottom }}
      data={list?.cards ?? []}
      keyExtractor={(card) => card.id}
      renderItem={({ item }) => <Card card={item} />}
      ListHeaderComponent={<PlaceHeader list={list} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
    />
  );
}
