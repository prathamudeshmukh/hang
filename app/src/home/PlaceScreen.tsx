import { FlashList, type FlashListRef } from '@shopify/flash-list';
import { useRef, type ReactElement } from 'react';
import { RefreshControl, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/grid/Card';
import type { CardModel } from '@/grid/cardModel';
import { columnsFor } from '@/grid/columns';
import { useGridStyles } from '@/grid/gridStyles';
import { PlaceControls } from '@/grid/PlaceControls';
import { usePlaceView, type PlaceViewControls } from '@/grid/usePlaceView';
import { useFeedOpener } from '@/feed/useFeedOpener';
import { HeroScope } from '@/hero/HeroFace';
import { useListOrigin } from '@/hero/useOrigins';
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

interface WallProps {
  readonly scope: string;
  readonly cards: readonly CardModel[];
  readonly header: ReactElement;
}

/** The masonry itself, registered as the place a flight back to one of its cards lands (#32). */
function Wall({ scope, cards, header }: WallProps) {
  const insets = useSafeAreaInsets();
  const styles = useGridStyles();
  const { color } = useTheme();
  const { fontScale } = useWindowDimensions();
  const { refreshing, onRefresh } = useRefresh();
  const columns = columnsFor(fontScale);
  // The feed swipes through the wall as shown: same filter, same Shuffle order (#31).
  const shownIds = cards.map(({ id }) => id);
  const openFeed = useFeedOpener(shownIds, scope);
  const wall = useRef<FlashListRef<CardModel>>(null);
  const frame = useListOrigin(scope, wall, shownIds);

  return (
    <View ref={frame} collapsable={false} style={styles.wall}>
      <FlashList
        ref={wall}
        key={columns}
        masonry
        numColumns={columns}
        style={styles.wall}
        contentContainerStyle={{ ...styles.content, paddingTop: insets.top + SPACE.screenTop, paddingBottom: insets.bottom + SPACE.screenBottom }}
        data={cards}
        keyExtractor={(card) => card.id}
        renderItem={({ item }) => <Card card={item} onOpen={openFeed} />}
        ListHeaderComponent={header}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
      />
    </View>
  );
}

/** The Inbox or one collection as a masonry wall, newest first unless filtered or shuffled (DESIGN.md §8, #42). */
export function PlaceScreen({ place }: { readonly place: Place }) {
  const list = useLiveQuery(() => readPlace(appListSources, place), placeKey(place));
  const controls = usePlaceView(list?.cards ?? NO_CARDS);
  const scope = placeKey(place);
  return (
    <HeroScope scope={scope}>
      <Wall scope={scope} cards={controls.view.cards} header={<PlaceHeader list={list} controls={controls} />} />
    </HeroScope>
  );
}
