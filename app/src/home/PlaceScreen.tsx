import { FlatList, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { appListSources } from './appListSources';
import { readPlace, type Place } from './homeLists';
import { ItemRowView } from './ItemRowView';
import { useListStyles } from './listStyles';
import { SyncProblem } from './SyncProblem';
import { useLiveQuery } from './useLiveQuery';
import { useRefresh } from './useRefresh';

const placeKey = (place: Place) => (place.kind === 'inbox' ? 'inbox' : `collection:${place.id}`);
const TOP_GAP = 24;
const BOTTOM_GAP = 40;

/** The Inbox or one collection, newest first. Slice 4 swaps the list for the masonry grid. */
export function PlaceScreen({ place }: { readonly place: Place }) {
  const insets = useSafeAreaInsets();
  const styles = useListStyles();
  const { color } = useTheme();
  const list = useLiveQuery(() => readPlace(appListSources, place), placeKey(place));
  const { refreshing, onRefresh } = useRefresh();

  return (
    <FlatList
      style={styles.wall}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_GAP, paddingBottom: insets.bottom + BOTTOM_GAP }]}
      data={list?.rows ?? []}
      keyExtractor={(row) => row.id}
      renderItem={({ item }) => <ItemRowView row={item} />}
      ListHeaderComponent={
        <>
          <NameText token="display">{list?.title ?? 'Gone'}</NameText>
          <SyncProblem />
        </>
      }
      ListEmptyComponent={<NoteText style={styles.section}>{list ? 'An empty wall. Share anything from another app to hang it here.' : 'This collection isn’t on this device any more.'}</NoteText>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
    />
  );
}
