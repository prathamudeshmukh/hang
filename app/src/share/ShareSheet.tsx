import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { parseShare, type ShareIntentProps } from './parseShare';
import type { CollectionChoice, ShareOpening } from './shareCapture';
import { createAppShareCapture } from './shareSession';
import { sheetHint, sheetNote } from './sheetNote';
import { Pill } from '@/theme/Pill';
import { ActionText, NameText, NoteText } from '@/theme/Text';
import { makeStyles, useTheme } from '@/theme/theme';
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

interface ChipsProps {
  readonly choices: readonly CollectionChoice[];
  readonly selected: string | null;
  readonly onSelect: (collectionId: string) => void;
}

function CollectionChips({ choices, selected, onSelect }: ChipsProps) {
  const styles = useStyles();
  const { color } = useTheme();
  return (
    <>
      <NoteText token="prompt" color="ink" style={styles.prompt}>Where does it hang?</NoteText>
      <View style={styles.chips}>
        {choices.map(({ id, name }) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityState={{ selected: id === selected }}
            android_ripple={{ color: color.ripple }}
            onPress={() => onSelect(id)}
            style={[styles.chip, id === selected && styles.chipOn]}
          >
            <ActionText token="actionS" style={id === selected ? { color: color.wall } : null}>{name}</ActionText>
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
  const styles = useStyles();
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
              <NameText token="titleS" numberOfLines={2}>{share.sharedTitle ?? (share.kind === 'unsupported' ? 'No link in this share' : host)}</NameText>
              <NoteText>{sheetNote(opening, host)}</NoteText>
            </View>
          </View>
          {choices.length > 0 && <CollectionChips choices={choices} selected={selected} onSelect={setSelected} />}
          <View style={styles.footer}>
            <NoteText style={styles.hint}>{sheetHint(opening)}</NoteText>
            {choices.length > 0 && <Pill kind="accent" label="Save" disabled={selected === null} onPress={save} />}
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
const CHIP_PADDING_X = 14;

const useStyles = makeStyles(({ color }) => ({
  scrim: { backgroundColor: color.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.wall, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: SPACE.margin, paddingTop: 10 },
  handle: { alignSelf: 'center', ...HANDLE, borderRadius: RADIUS.print, backgroundColor: color.rule, marginBottom: SPACE.rhythm },
  preview: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  print: { width: SHEET.printSize, height: SHEET.printSize, borderRadius: RADIUS.print },
  printEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: color.ink3 },
  previewText: { flex: 1, gap: 2 },
  prompt: { marginTop: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  chip: { minHeight: SPACE.touch, justifyContent: 'center', borderRadius: RADIUS.pill, borderWidth: 1, borderColor: color.rule, backgroundColor: color.raised, paddingHorizontal: CHIP_PADDING_X, overflow: 'hidden' },
  chipOn: { backgroundColor: color.ink, borderColor: color.ink },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12 },
  hint: { flex: 1 },
}));
