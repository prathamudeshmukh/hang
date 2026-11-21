import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountLine } from '@/auth/AccountLine';
import { PageScroller, useScroller } from '@/hero/useOrigins';
import { appListSources } from '@/home/appListSources';
import { RoomGrid } from '@/home/RoomGrid';
import { dayKey, dayLine, greetingFor } from '@/home/homeCopy';
import { readHome } from '@/home/homeLists';
import { HowToWall } from '@/home/howto/HowToWall';
import { WaitingWall } from '@/home/howto/WaitingWall';
import { useHomeStyles } from '@/home/homeStyles';
import { RecentStrip } from '@/home/RecentStrip';
import { RediscoverSection } from '@/home/RediscoverSection';
import { SyncProblem } from '@/home/SyncProblem';
import { useLiveQuery } from '@/home/useLiveQuery';
import { useRefresh } from '@/home/useRefresh';
import { useKeyboardRoom } from '@/home/useKeyboardRoom';
import { useToday } from '@/home/useToday';
import { NameText, NoteText } from '@/theme/Text';
import { useAuth } from '@/auth/useAuth';
import { useTheme } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';

/** Offsets only matter when a flight comes back, so a few reports a frame is plenty. */
const SCROLL_THROTTLE_MS = 32;

/** Home (SPEC #16, DESIGN.md sheet): Today on the feature wall (greeting → Recently saved, holding the Inbox → Rediscover; the how-to while it is empty, #75), then collections. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const styles = useHomeStyles();
  const { color } = useTheme();
  const today = useToday();
  const day = dayKey(today);
  const syncFailed = useAuth().lastSync.kind === 'error';
  // A fresh `now` on every read: cards waiting for an image stop after 2 minutes (#34); the day still follows `today`.
  const home = useLiveQuery(() => readHome(appListSources, { now: new Date(), syncFailed }), `home:${day}:${syncFailed}`);
  const { refreshing, onRefresh } = useRefresh();
  const { attach: attachPage, onScroll: onPageScroll, step: pageStep } = useScroller('y');
  const { ref: pageRef, keyboardHeight } = useKeyboardRoom(attachPage);

  return (
    <PageScroller.Provider value={pageStep}>
    <ScrollView
      ref={pageRef}
      onScroll={onPageScroll}
      scrollEventThrottle={SCROLL_THROTTLE_MS}
      style={styles.wall}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + SPACE.screenBottom + keyboardHeight }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
    >
      <View style={[styles.featureWall, { paddingTop: insets.top + SPACE.screenTop }]}>
        <View testID="home-greeting" accessible accessibilityRole="header">
          <NoteText>{dayLine(today)}</NoteText>
          <NameText token="display" style={styles.greeting}>{greetingFor(today)}</NameText>
        </View>
        <SyncProblem />
        {home.wall === 'hanging' ? <RecentStrip recent={home.recent} inboxCount={home.inboxCount} /> : null}
        {/* Polite: a screen reader hears the wall change from waiting to the how-to (#75). */}
        <View accessibilityLiveRegion="polite">
          {home.wall === 'empty' ? <HowToWall /> : null}
          {home.wall === 'waiting' ? <WaitingWall /> : null}
        </View>
        {home.rediscover ? <RediscoverSection key={`${home.rediscover.card.id}:${day}`} pick={home.rediscover} day={day} /> : null}
      </View>
      <RoomGrid collections={home.collections} />
      <AccountLine />
    </ScrollView>
    </PageScroller.Provider>
  );
}
