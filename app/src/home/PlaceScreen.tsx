import { FlashList } from '@shopify/flash-list';
import { RefreshControl, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/grid/Card';
import type { CardModel } from '@/grid/cardModel';
import { columnsFor } from '@/grid/columns';
import { useGridStyles } from '@/grid/gridStyles';
import { PlaceControls } from '@/grid/PlaceControls';
import { usePlaceView, type PlaceViewControls } from '@/grid/usePlaceView';
import { useFeedOpener } from '@/feed/useFeedOpener';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { appListSources } from './appListSources';
import { readPlace, type Place, type PlaceList } from './homeLists';
import { SyncProblem } from './SyncProblem';
import { useLiveQuery } from './useLiveQuery';
import { useRefresh } from './useRefresh';

const NO_CARDS: readonly CardModel[] = [];
const placeKey = (place: Place) => (place.kind === 'inbox' ? 'inbox' : `collection:${place.id}`);
const EMPTY_WALL = 'An empty wall. Share anything from another app to hang it here.';
const GONE = 'This collection isn’t on this device any more.';

function PlaceHeader({ list, controls }: { readonly list: PlaceList | null; readonly controls: PlaceViewControls }) {
  const styles = useGridStyles();
  return (
    <View style={styles.header}>
      <NameText token="display">{list?.title ?? 'Gone'}</NameText>
      <PlaceControls {...controls} />
      <SyncProblem />
      {list?.cards.length === 0 ? <NoteText>{EMPTY_WALL}</NoteText> : null}
      {list ? null : <NoteText>{GONE}</NoteText>}
    </View>
  );
}

/** The Inbox or one collection as a masonry wall, newest first unless filtered or shuffled (DESIGN.md §8, #42). */
export function PlaceScreen({ place }: { readonly place: Place }) {
  const insets = useSafeAreaInsets();
  const styles = useGridStyles();
  const { color } = useTheme();
  const { fontScale } = useWindowDimensions();
  const list = useLiveQuery(() => readPlace(appListSources, place), placeKey(place));
  const { refreshing, onRefresh } = useRefresh();
  const columns = columnsFor(fontScale);
  const controls = usePlaceView(list?.cards ?? NO_CARDS);
  // The feed swipes through the wall as shown: same filter, same Shuffle order (#31).
  const openFeed = useFeedOpener(controls.view.cards.map(({ id }) => id));

  return (
    <FlashList
      key={columns}
      masonry
      numColumns={columns}
      style={styles.wall}
      contentContainerStyle={{ ...styles.content, paddingTop: insets.top + SPACE.screenTop, paddingBottom: insets.bottom + SPACE.screenBottom }}
      data={controls.view.cards}
      keyExtractor={(card) => card.id}
      renderItem={({ item }) => <Card card={item} onOpen={openFeed} />}
      ListHeaderComponent={<PlaceHeader list={list} controls={controls} />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
    />
  );
}
