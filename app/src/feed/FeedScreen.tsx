import { NavigationBar } from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { FlatList, View, type LayoutChangeEvent, type ListViewToken } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { openItem } from '@/home/appItemActions';
import { useLiveQuery } from '@/home/useLiveQuery';
import { ScreeningRoom } from '@/theme/ScreeningRoom';
import { NoteText } from '@/theme/Text';
import { SPACE } from '@/theme/tokens';
import { feedSources, moveItem } from './appFeed';
import { shownId } from './currentPage';
import { counterText } from './feedCopy';
import { originsOf, readFeed } from './feedList';
import type { FeedPage } from './feedPage';
import { FeedPageView, type PageStep } from './FeedPageView';
import type { FeedSession } from './feedSession';
import { useFeedStyles } from './feedStyles';
import { MoveSheet } from './MoveSheet';
import { TopShade } from './TopShade';
import type { CardModel } from '@/grid/cardModel';
import { reportMediaDrawn, useFeedHero, useFeedTextFade } from './useFeedHero';

const NOTHING_LEFT = 'Nothing here any more.';
const VISIBLE_TO_COUNT = { itemVisiblePercentThreshold: 60 } as const;
const PAGES_KEPT_DRAWN = 3;

/** The snapshot's ids in order, with contents that follow local writes and sync (#31 decision 6). */
function useFeedPages(session: FeedSession, key: string): readonly FeedPage[] {
  const [origins] = useState(() => originsOf(feedSources, session.ids));
  return useLiveQuery(() => readFeed(feedSources, session.ids, origins), key);
}

/** The page on screen by id, so the counter and TalkBack steps follow it when items before it drop out. */
function useCurrentPage(session: FeedSession, pages: readonly FeedPage[]) {
  const [seenId, setSeenId] = useState(session.start);
  // FlatList refuses a new onViewableItemsChanged after mount, so this one never changes.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { readonly viewableItems: readonly ListViewToken[] }) => {
    const shown = viewableItems[0]?.item as FeedPage | undefined;
    if (shown) setSeenId(shown.card.id);
  }, []);
  const currentId = shownId(session.ids, pages.map(({ card }) => card.id), seenId);
  return { index: pages.findIndex(({ card }) => card.id === currentId), onViewableItemsChanged };
}

/** TalkBack's next/previous, stable across swipes so drawn pages don't redraw. */
function useStep(list: RefObject<FlatList<FeedPage> | null>, index: number, total: number) {
  const latest = useRef({ index, total });
  useEffect(() => {
    latest.current = { index, total };
  });
  return useCallback((direction: PageStep) => {
    const target = latest.current.index + (direction === 'next' ? 1 : -1);
    if (target < 0 || target >= latest.current.total) return;
    latest.current = { ...latest.current, index: target };
    list.current?.scrollToIndex({ index: target });
  }, [list]);
}

function Counter({ text }: { readonly text: string | null }) {
  const styles = useFeedStyles();
  const insets = useSafeAreaInsets();
  const textFade = useFeedTextFade();
  if (text === null) return null;
  return (
    <Animated.View style={[styles.counter, { top: insets.top + SPACE.tight }, textFade]} pointerEvents="none">
      <NoteText testID="feed-counter" color="ink">{text}</NoteText>
    </Animated.View>
  );
}

interface PagerProps {
  readonly session: FeedSession;
  readonly pages: readonly FeedPage[];
  readonly height: number;
  /** The card on screen, for the flight back (#32). */
  readonly onShown: (card: CardModel | null) => void;
}

const openPage = (page: FeedPage) => void openItem(page.card);
/** Items deleted above the page on screen must not scroll a different item into view. */
const KEEP_VISIBLE_PAGE = { minIndexForVisible: 0 } as const;

function Pager({ session, pages, height, onShown }: PagerProps) {
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<FeedPage>>(null);
  const { index, onViewableItemsChanged } = useCurrentPage(session, pages);
  const step = useStep(list, index, pages.length);
  const shownCard = pages[index]?.card ?? null;
  useEffect(() => onShown(shownCard), [onShown, shownCard]);
  // Only the id: the sheet reads the page live, so a re-file by sync shows the right place.
  const [movingId, setMovingId] = useState<string | null>(null);
  const [initialIndex] = useState(() => Math.max(0, pages.findIndex(({ card }) => card.id === session.start)));
  const bottomInset = insets.bottom + SPACE.rhythm;
  const startMove = useCallback((page: FeedPage) => setMovingId(page.card.id), []);
  const renderItem = useCallback(
    ({ item }: { readonly item: FeedPage }) => <FeedPageView page={item} height={height} bottomInset={bottomInset} onOpen={openPage} onMove={startMove} onStep={step} onMediaDrawn={reportMediaDrawn} />,
    [height, bottomInset, startMove, step],
  );

  return (
    <>
      <FlatList
        ref={list}
        data={pages}
        keyExtractor={(page) => page.card.id}
        renderItem={renderItem}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        initialScrollIndex={initialIndex}
        getItemLayout={(_, at) => ({ length: height, offset: height * at, index: at })}
        maintainVisibleContentPosition={KEEP_VISIBLE_PAGE}
        windowSize={PAGES_KEPT_DRAWN}
        initialNumToRender={1}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={VISIBLE_TO_COUNT}
      />
      <TopShade />
      <Counter text={counterText(index, pages.length)} />
      <MoveSheetHost page={pages.find(({ card }) => card.id === movingId) ?? null} onClose={() => setMovingId(null)} />
    </>
  );
}

function MoveSheetHost({ page, onClose }: { readonly page: FeedPage | null; readonly onClose: () => void }) {
  return (
    <MoveSheet
      page={page}
      onClose={onClose}
      onChoose={(moved, collectionId) => {
        moveItem({ id: moved.card.id, from: moved.placeId, to: collectionId });
        onClose();
      }}
    />
  );
}

/** The screening room (DESIGN.md §8): always dark, one item per page, swipe up for the next. */
export function FeedScreen({ session, sessionKey }: { readonly session: FeedSession; readonly sessionKey: string }) {
  const styles = useFeedStyles();
  const pages = useFeedPages(session, sessionKey);
  const [height, setHeight] = useState(0);
  const { onShown, onSize, opacity } = useFeedHero();
  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: laidOut } = event.nativeEvent.layout;
    setHeight(laidOut);
    onSize({ width, height: laidOut });
  };
  useEffect(() => {
    if (pages.length === 0) onShown(null);
  }, [pages.length, onShown]);

  return (
    <ScreeningRoom>
      <StatusBar style="light" />
      <NavigationBar style="light" />
      <Animated.View testID="feed" style={[styles.screen, opacity]} onLayout={onLayout}>
        {pages.length === 0 ? (
          <View style={styles.empty}>
            <NoteText token="prompt">{NOTHING_LEFT}</NoteText>
          </View>
        ) : null}
        {pages.length > 0 && height > 0 ? <Pager session={session} pages={pages} height={height} onShown={onShown} /> : null}
      </Animated.View>
    </ScreeningRoom>
  );
}
