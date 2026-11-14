import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLine } from '@/auth/AccountLine';
import { PageScroller, useScroller } from '@/hero/useOrigins';
import { appListSources } from '@/home/appListSources';
import { CollectionList } from '@/home/CollectionList';
import { dayKey, dayLine, greetingFor } from '@/home/homeCopy';
import { readHome } from '@/home/homeLists';
import { useHomeStyles } from '@/home/homeStyles';
import { RecentStrip } from '@/home/RecentStrip';
import { RediscoverSection } from '@/home/RediscoverSection';
import { SyncProblem } from '@/home/SyncProblem';
import { useLiveQuery } from '@/home/useLiveQuery';
import { useRefresh } from '@/home/useRefresh';
import { useToday } from '@/home/useToday';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';

/** Offsets only matter when a flight comes back, so a few reports a frame is plenty. */
const SCROLL_THROTTLE_MS = 32;

/** Home (SPEC #16, DESIGN.md sheet): greeting → Recently saved (holds the Inbox) → Rediscover → collections. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const styles = useHomeStyles();
  const { color } = useTheme();
  const today = useToday();
  const day = dayKey(today);
  // A fresh `now` on every read: cards waiting for an image stop after 2 minutes (#34); the day still follows `today`.
  const home = useLiveQuery(() => readHome(appListSources, new Date()), `home:${day}`);
  const { refreshing, onRefresh } = useRefresh();
  const { attach: attachPage, onScroll: onPageScroll, step: pageStep } = useScroller('y');

  return (
    <PageScroller.Provider value={pageStep}>
    <ScrollView
      ref={attachPage}
      onScroll={onPageScroll}
      scrollEventThrottle={SCROLL_THROTTLE_MS}
      style={styles.wall}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + SPACE.screenTop, paddingBottom: insets.bottom + SPACE.screenBottom }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
    >
      <View testID="home-greeting" accessible accessibilityRole="header">
        <NoteText>{dayLine(today)}</NoteText>
        <NameText token="display" style={styles.greeting}>{greetingFor(today)}</NameText>
      </View>
      <SyncProblem />
      <RecentStrip recent={home.recent} inboxCount={home.inboxCount} />
      {home.rediscover ? <RediscoverSection key={`${home.rediscover.card.id}:${day}`} pick={home.rediscover} day={day} /> : null}
      <CollectionList collections={home.collections} />
      <AccountLine />
    </ScrollView>
    </PageScroller.Provider>
  );
}
