import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseShare, type ShareIntentProps } from './parseShare';
import type { CollectionChoice, ShareOpening } from './shareCapture';
import { ExistingNoteText } from './ExistingNoteText';
import { createAppShareCapture } from './shareSession';
import { canSave, sheetHint, sheetNote } from './sheetNote';
import { CollectionChips } from '@/collections/CollectionChips';
import { Pill } from '@/theme/Pill';
import { NameText, NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { SHEET } from './tokens';
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

function choicesOf(opening: ShareOpening | null): readonly CollectionChoice[] {
  return opening?.kind === 'saved' || opening?.kind === 'existing' ? opening.collections : [];
}

/** The item the sheet files: the one it just saved, or the one the link already was (#19). */
function itemIdOf(opening: ShareOpening | null): string | null {
  if (opening?.kind === 'saved') return opening.itemId;
  return opening?.kind === 'existing' ? opening.item.id : null;
}

function Sheet({ openedAt, ...intent }: ShareSheetProps) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [share] = useState(() => parseShare(intent));
  const [capture] = useState(createAppShareCapture);
  const [opening, setOpening] = useState<ShareOpening | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    void capture.open(share).then((opened) => {
      setOpening(opened);
      // A re-shared link starts on the place it already hangs.
      if (opened.kind === 'existing') setSelected(opened.item.place?.id ?? null);
    });
  }, [capture, share]);

  const leaveInInbox = useCallback(() => void capture.close(), [capture]);
  const { close, isClosing, pan, sheetStyle, scrimStyle } = useSheetMotion(leaveInInbox);

  /** Files before the slide-out starts, so the choice is on disk even if the process dies mid-animation. */
  const save = () => {
    const itemId = itemIdOf(opening);
    if (itemId === null || selected === null || !canSave(opening, selected) || isClosing()) return;
    capture.file(itemId, selected);
    close(leaveInInbox);
  };

  const choices = choicesOf(opening);
  const host = hostOf(share.url);
  const existing = opening?.kind === 'existing' ? opening : null;
  const printUri = existing ? existing.item.thumbUri : share.imageUri;
  const title = existing?.item.title ?? share.sharedTitle ?? (share.kind === 'unsupported' ? 'No link in this share' : host);
  // A new share shows Save from the start (disabled until a pick); a re-shared one only once the pick would move it.
  const showsSave = existing ? canSave(opening, selected) : choices.length > 0;

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
            {printUri ? <Image source={printUri} style={styles.print} contentFit="cover" /> : <View style={[styles.print, styles.printEmpty]} />}
            <View style={styles.previewText}>
              <NameText token="titleS" numberOfLines={2}>{title}</NameText>
              {existing ? <ExistingNoteText opening={existing} /> : <NoteText>{sheetNote(opening, host)}</NoteText>}
            </View>
          </View>
          {choices.length > 0 && <CollectionChips choices={choices} selected={selected ?? undefined} onSelect={setSelected} />}
          <View style={styles.footer}>
            <NoteText style={styles.hint}>{sheetHint(opening, selected)}</NoteText>
            {showsSave && <Pill kind="accent" label="Save" disabled={!canSave(opening, selected)} onPress={save} />}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

/** Root component for ShareActivity ("ShareSheet" in AppRegistry). */
export function ShareSheetRoot(props: ShareSheetProps) {
  return (
    <GestureHandlerRootView style={ROOT}>
      <SafeAreaProvider>
        <Sheet {...props} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const ROOT = { flex: 1, backgroundColor: 'transparent' } as const;
const HANDLE = { width: 32, height: 4 } as const;

const useStyles = makeStyles(({ color }) => ({
  scrim: { backgroundColor: color.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.wall, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: SPACE.margin, paddingTop: 10 },
  handle: { alignSelf: 'center', ...HANDLE, borderRadius: RADIUS.print, backgroundColor: color.rule, marginBottom: SPACE.rhythm },
  preview: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  print: { width: SHEET.printSize, height: SHEET.printSize, borderRadius: RADIUS.print },
  printEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: color.ink3 },
  previewText: { flex: 1, gap: 2 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12 },
  hint: { flex: 1 },
}));
