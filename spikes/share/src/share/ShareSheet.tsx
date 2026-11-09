import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseShare, type ShareIntentProps } from './parseShare';
import { JS_BOOTED_AT, recordShare } from './store';
import { COLLECTIONS, COLOR, FONT, SHEET } from './tokens';
import { useSheetMotion } from './useSheetMotion';

export interface ShareSheetProps extends ShareIntentProps {
  /** System.currentTimeMillis() when ShareActivity was created. */
  readonly openedAt?: number;
}

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : 'image';
  } catch {
    return 'link';
  }
}

function Sheet({ openedAt: nativeOpenedAt, ...intent }: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const [openedAt] = useState(() => nativeOpenedAt ?? Date.now());
  const share = useMemo(() => parseShare(intent), [intent]);
  const [collection, setCollection] = useState<string>(COLLECTIONS[0]);
  const [openMs, setOpenMs] = useState<number | null>(null);
  const coldStart = openedAt < JS_BOOTED_AT;

  const record = useCallback(
    (target: string | null) => recordShare({ share, collection: target, openMs: openMs ?? 0, coldStart, receivedAt: Date.now() }),
    [share, openMs, coldStart],
  );
  const toInbox = useCallback(() => record(null), [record]);
  const { close, pan, sheetStyle, scrimStyle } = useSheetMotion(toInbox);

  const title = share.sharedTitle ?? hostOf(share.url);
  const unsupported = share.kind === 'unsupported';

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(toInbox)} accessibilityLabel="Leave it in Inbox" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }, sheetStyle]}
          onLayout={() => setOpenMs((ms) => ms ?? Date.now() - openedAt)}
        >
          <View style={styles.handle} />
          <View style={styles.preview}>
            {share.imageUri ? <Image source={share.imageUri} style={styles.print} contentFit="cover" /> : <View style={[styles.print, styles.printEmpty]} />}
            <View style={styles.previewText}>
              <Text style={styles.previewTitle} numberOfLines={2}>{title}</Text>
              <Text style={styles.note}>{unsupported ? 'nothing to hang here' : `${hostOf(share.url)} · reading it now…`}</Text>
            </View>
          </View>
          <Text style={styles.prompt}>Where does it hang?</Text>
          <View style={styles.chips}>
            {COLLECTIONS.map((name) => (
              <Pressable key={name} onPress={() => setCollection(name)} style={[styles.chip, name === collection && styles.chipOn]}>
                <Text style={[styles.chipLabel, name === collection && styles.chipLabelOn]}>{name}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.footer}>
            <Text style={styles.note}>Swipe down to leave it in Inbox</Text>
            <Pressable disabled={unsupported} onPress={() => close(() => record(collection))} style={[styles.save, unsupported && styles.saveOff]}>
              <Text style={styles.saveLabel}>Save</Text>
            </Pressable>
          </View>
          <Text style={styles.debug}>{openMs === null ? '…' : `opened in ${openMs} ms · ${coldStart ? 'cold' : 'warm'} JS`}</Text>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Root component for ShareActivity ("ShareSheet" in AppRegistry). */
export function ShareSheetRoot(props: ShareSheetProps) {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <Sheet {...props} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'transparent' },
  scrim: { backgroundColor: COLOR.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: COLOR.wall, borderTopLeftRadius: SHEET.radius, borderTopRightRadius: SHEET.radius, paddingHorizontal: 16, paddingTop: 10 },
  handle: { alignSelf: 'center', width: 32, height: 4, borderRadius: 2, backgroundColor: COLOR.rule, marginBottom: 14 },
  preview: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  print: { width: SHEET.printSize, height: SHEET.printSize, borderRadius: SHEET.printRadius },
  printEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: COLOR.ink3 },
  previewText: { flex: 1 },
  previewTitle: { fontFamily: FONT.serif, fontSize: 17, lineHeight: 20, color: COLOR.ink },
  note: { fontFamily: FONT.serif, fontStyle: 'italic', fontSize: 13, color: COLOR.ink3, marginTop: 2 },
  prompt: { fontFamily: FONT.serif, fontSize: 15, color: COLOR.ink, marginTop: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: 40, justifyContent: 'center', borderRadius: 99, borderWidth: 1, borderColor: COLOR.rule, backgroundColor: COLOR.raised, paddingHorizontal: 14 },
  chipOn: { backgroundColor: COLOR.ink, borderColor: COLOR.ink },
  chipLabel: { fontSize: 13, fontWeight: '600', color: COLOR.ink },
  chipLabelOn: { color: COLOR.wall },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20 },
  save: { backgroundColor: COLOR.accent, borderRadius: 99, paddingHorizontal: 22, paddingVertical: 11 },
  saveOff: { opacity: 0.4 },
  saveLabel: { color: '#fff', fontWeight: '600', fontSize: 14 },
  debug: { fontSize: 11, color: COLOR.ink3, marginTop: 12, textAlign: 'center' },
});
