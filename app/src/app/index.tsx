import { Link, type Href } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountPanel } from '@/auth/AccountPanel';
import { appListSources } from '@/home/appListSources';
import { readHome, type CollectionRow } from '@/home/homeLists';
import { ItemRowView } from '@/home/ItemRowView';
import { listStyles, RIPPLE } from '@/home/listStyles';
import { NewCollectionRow } from '@/home/NewCollectionRow';
import { SyncProblem } from '@/home/SyncProblem';
import { useLiveQuery } from '@/home/useLiveQuery';
import { useRefresh } from '@/home/useRefresh';
import { COLOR } from '@/share/tokens';

const HOME_KEY = 'home';
const readAppHome = () => readHome(appListSources);

function PlaceRow({ href, name, count, testID }: { readonly href: Href; readonly name: string; readonly count: number; readonly testID?: string }) {
  return (
    <Link href={href} asChild>
      <Pressable testID={testID} accessibilityRole="link" android_ripple={RIPPLE} style={listStyles.placeRow}>
        <Text style={listStyles.rowTitle}>{name}</Text>
        <Text style={listStyles.count}>{count}</Text>
      </Pressable>
    </Link>
  );
}

const collectionRow = (collection: CollectionRow) => (
  <PlaceRow key={collection.id} href={{ pathname: '/collection/[id]', params: { id: collection.id } }} name={collection.name} count={collection.count} />
);

/** Home in the owner's shape (SPEC #16) as plain lists: Recently saved, then collections. Rediscover comes in Phase 2. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const home = useLiveQuery(readAppHome, HOME_KEY);
  const { refreshing, onRefresh } = useRefresh();

  return (
    <ScrollView
      style={listStyles.wall}
      contentContainerStyle={[listStyles.content, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 40 }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLOR.accent]} />}
    >
      <Text style={listStyles.title}>Hang</Text>
      <SyncProblem />

      <Text style={listStyles.section}>Recently saved</Text>
      {home.recent.length === 0 && <Text style={listStyles.note}>Share a link from Chrome, YouTube or X and pick “Hang”.</Text>}
      {home.recent.map((row) => <ItemRowView key={row.id} row={row} markInbox />)}
      <PlaceRow href="/inbox" name="Inbox" count={home.inboxCount} testID="inbox" />

      <Text style={listStyles.section}>Collections</Text>
      {home.collections.map(collectionRow)}
      <NewCollectionRow />

      <View style={{ marginTop: 40 }}>
        <AccountPanel />
      </View>
    </ScrollView>
  );
}
