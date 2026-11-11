import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AccountPanel } from '@/auth/AccountPanel';
import type { RecentItemRow } from '@/home/recentItems';
import { useRecentItems } from '@/home/useRecentItems';
import { COLOR, FONT } from '@/share/tokens';

function ItemRow({ row }: { readonly row: RecentItemRow }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle} numberOfLines={2}>{row.title}</Text>
      <Text style={styles.note} numberOfLines={1}>{row.url}</Text>
      <Text style={styles.note}>{`${row.place} · ${row.status} · ${row.queued ? 'waiting to sync' : 'synced'}`}</Text>
    </View>
  );
}

/** Phase 1 home: a plain list of what's on the device. Slice 7 replaces it with the Inbox and collections. */
export default function Home() {
  const insets = useSafeAreaInsets();
  const rows = useRecentItems();

  return (
    <View style={[styles.wall, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Hang</Text>
      <AccountPanel />
      <Text style={styles.note}>Share a link from Chrome, YouTube or X and pick “Hang”.</Text>
      <FlatList data={rows} keyExtractor={(row) => row.id} renderItem={({ item }) => <ItemRow row={item} />} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  wall: { flex: 1, backgroundColor: COLOR.wall, paddingHorizontal: 16 },
  title: { fontFamily: FONT.serif, fontSize: 40, color: COLOR.ink, letterSpacing: -1 },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.ink3, marginTop: 4 },
  row: { borderTopWidth: StyleSheet.hairlineWidth, borderColor: COLOR.rule, paddingVertical: 14, marginTop: 14 },
  rowTitle: { fontFamily: FONT.serif, fontSize: 18, color: COLOR.ink },
});
