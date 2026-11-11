import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseShare, type ShareIntentProps } from './parseShare';
import type { CollectionChoice, ShareOpening } from './shareCapture';
import { createAppShareCapture } from './shareSession';
import { sheetHint, sheetNote } from './sheetNote';
import { COLOR, FONT, SHEET } from './tokens';
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

interface ChipsProps {
  readonly choices: readonly CollectionChoice[];
  readonly selected: string | null;
  readonly onSelect: (collectionId: string) => void;
}

function CollectionChips({ choices, selected, onSelect }: ChipsProps) {
  return (
    <>
      <Text style={styles.prompt}>Where does it hang?</Text>
      <View style={styles.chips}>
        {choices.map(({ id, name }) => (
          <Pressable key={id} onPress={() => onSelect(id)} style={[styles.chip, id === selected && styles.chipOn]}>
            <Text style={[styles.chipLabel, id === selected && styles.chipLabelOn]}>{name}</Text>
          </Pressable>
        ))}
      </View>
    </>
  );
}

function choicesOf(opening: ShareOpening | null): readonly CollectionChoice[] {
  return opening?.kind === 'saved' ? opening.collections : [];
}

function Sheet({ openedAt, ...intent }: ShareSheetProps) {
  const insets = useSafeAreaInsets();
  const [share] = useState(() => parseShare(intent));
  const [capture] = useState(createAppShareCapture);
  const [opening, setOpening] = useState<ShareOpening | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void capture.open(share).then(setOpening);
  }, [capture, share]);

  const leaveInInbox = useCallback(() => void capture.close(), [capture]);
  const { close, isClosing, pan, sheetStyle, scrimStyle } = useSheetMotion(leaveInInbox);

  /** Files before the slide-out starts, so the choice is on disk even if the process dies mid-animation. */
  const save = () => {
    if (opening?.kind !== 'saved' || selected === null || isClosing()) return;
    capture.file(opening.itemId, selected);
    close(leaveInInbox);
  };

  const choices = choicesOf(opening);
  const host = hostOf(share.url);

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(leaveInInbox)} accessibilityLabel="Leave it in Inbox" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, { paddingBottom: insets.bottom + 20 }, sheetStyle]}
          onLayout={() => {
            if (__DEV__ && openedAt) console.info(`Share sheet laid out ${Date.now() - openedAt} ms after ShareActivity started`);
          }}
        >
          <View style={styles.handle} />
          <View style={styles.preview}>
            {share.imageUri ? <Image source={share.imageUri} style={styles.print} contentFit="cover" /> : <View style={[styles.print, styles.printEmpty]} />}
            <View style={styles.previewText}>
              <Text style={styles.previewTitle} numberOfLines={2}>{share.sharedTitle ?? (share.kind === 'unsupported' ? 'No link in this share' : host)}</Text>
              <Text style={styles.note}>{sheetNote(opening, host)}</Text>
            </View>
          </View>
          {choices.length > 0 && <CollectionChips choices={choices} selected={selected} onSelect={setSelected} />}
          <View style={styles.footer}>
            <Text style={styles.note}>{sheetHint(opening)}</Text>
            {choices.length > 0 && (
              <Pressable disabled={selected === null} onPress={save} style={[styles.save, selected === null && styles.saveOff]}>
                <Text style={styles.saveLabel}>Save</Text>
              </Pressable>
            )}
          </View>
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
});
