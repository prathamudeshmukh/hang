import { FlatList, RefreshControl, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLOR } from '@/share/tokens';
import { appListSources } from './appListSources';
import { readPlace, type Place } from './homeLists';
import { ItemRowView } from './ItemRowView';
import { listStyles } from './listStyles';
import { SyncProblem } from './SyncProblem';
import { useLiveQuery } from './useLiveQuery';
import { useRefresh } from './useRefresh';

const placeKey = (place: Place) => (place.kind === 'inbox' ? 'inbox' : `collection:${place.id}`);

/** The Inbox or one collection, newest first. Phase 2 swaps the list for the masonry grid. */
export function PlaceScreen({ place }: { readonly place: Place }) {
  const insets = useSafeAreaInsets();
  const list = useLiveQuery(() => readPlace(appListSources, place), placeKey(place));
  const { refreshing, onRefresh } = useRefresh();

  return (
    <FlatList
      style={listStyles.wall}
      contentContainerStyle={[listStyles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
      data={list?.rows ?? []}
      keyExtractor={(row) => row.id}
      renderItem={({ item }) => <ItemRowView row={item} />}
      ListHeaderComponent={
        <>
          <Text style={listStyles.title}>{list?.title ?? 'Gone'}</Text>
          <SyncProblem />
        </>
      }
      ListEmptyComponent={<Text style={listStyles.note}>{list ? 'Nothing here yet.' : 'This collection isn’t on this device any more.'}</Text>}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLOR.accent]} />}
    />
  );
}
