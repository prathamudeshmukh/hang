import { useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type ReceivedShare, subscribe } from '@/share/store';
import { COLOR, FONT } from '@/share/tokens';

function ShareRow({ entry }: { readonly entry: ReceivedShare }) {
  const { share } = entry;
  return (
    <View style={styles.row}>
      <Text style={styles.rowTitle} numberOfLines={2}>{share.sharedTitle ?? share.url ?? share.imageUri ?? '(nothing)'}</Text>
      <Text style={styles.note} numberOfLines={1}>{share.url ?? share.imageUri}</Text>
      <Text style={styles.note}>
        {entry.collection ?? 'Inbox'} · {share.kind} · opened in {entry.openMs} ms ({entry.coldStart ? 'cold' : 'warm'})
      </Text>
    </View>
  );
}

export default function Received() {
  const insets = useSafeAreaInsets();
  const [shares, setShares] = useState<readonly ReceivedShare[]>([]);
  useEffect(() => subscribe(setShares), []);

  return (
    <View style={[styles.wall, { paddingTop: insets.top + 24 }]}>
      <Text style={styles.title}>Share spike</Text>
      <Text style={styles.note}>Share a link from Chrome, YouTube or X and pick “Hang Share”. Shares received while this process lives appear below.</Text>
      <FlatList data={shares} keyExtractor={(entry) => String(entry.receivedAt)} renderItem={({ item }) => <ShareRow entry={item} />} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} />
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
