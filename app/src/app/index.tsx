import { Link, type Href } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountPanel } from '@/auth/AccountPanel';
import { appListSources } from '@/home/appListSources';
import { readHome, type CollectionRow } from '@/home/homeLists';
import { ItemRowView } from '@/home/ItemRowView';
import { useListStyles } from '@/home/listStyles';
import { NewCollectionRow } from '@/home/NewCollectionRow';
import { SyncProblem } from '@/home/SyncProblem';
import { useLiveQuery } from '@/home/useLiveQuery';
import { useRefresh } from '@/home/useRefresh';
import { NameText, NoteText } from '@/theme/Text';
import { useTheme } from '@/theme/theme';

const HOME_KEY = 'home';
const readAppHome = () => readHome(appListSources);
const TOP_GAP = 24;
const BOTTOM_GAP = 40;

function PlaceRow({ href, name, count, testID }: { readonly href: Href; readonly name: string; readonly count: number; readonly testID?: string }) {
  const styles = useListStyles();
  const { color } = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable testID={testID} accessibilityRole="link" android_ripple={{ color: color.ripple }} style={styles.placeRow}>
        <NameText token="titleS">{name}</NameText>
        <NoteText>{String(count)}</NoteText>
      </Pressable>
    </Link>
  );
}

const collectionRow = (collection: CollectionRow) => (
  <PlaceRow key={collection.id} href={{ pathname: '/collection/[id]', params: { id: collection.id } }} name={collection.name} count={collection.count} />
);

/** Home in the owner's shape (SPEC #16) as plain lists: Recently saved, then collections. Slice 5 gives it its real layout. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const styles = useListStyles();
  const { color } = useTheme();
  const home = useLiveQuery(readAppHome, HOME_KEY);
  const { refreshing, onRefresh } = useRefresh();

  return (
    <ScrollView
      style={styles.wall}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + TOP_GAP, paddingBottom: insets.bottom + BOTTOM_GAP }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[color.ink]} progressBackgroundColor={color.raised} />}
    >
      <NameText token="display">Hang</NameText>
      <SyncProblem />

      <NameText token="titleS" style={styles.section}>Recently saved</NameText>
      {home.recent.length === 0 && <NoteText>Share a link from Chrome, YouTube or X and pick “Hang”.</NoteText>}
      {home.recent.map((row) => <ItemRowView key={row.id} row={row} markInbox />)}
      <PlaceRow href="/inbox" name="Inbox" count={home.inboxCount} testID="inbox" />

      <NameText token="titleS" style={styles.section}>Collections</NameText>
      {home.collections.map(collectionRow)}
      <NewCollectionRow />

      <View style={{ marginTop: BOTTOM_GAP }}>
        <AccountPanel />
      </View>
    </ScrollView>
  );
}
