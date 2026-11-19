import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { parseShare, type ShareIntentProps } from './parseShare';
import type { ShareOpening } from './shareCapture';
import { createAppShareCapture } from './shareSession';
import { canSave, sheetHint } from './sheetNote';
import { SheetPreview } from './SheetPreview';
import { useNewCollections } from './useNewCollections';
import { CollectionChips } from '@/collections/CollectionChips';
import { useSheetLift } from '@/collections/useSheetLift';
import { Pill } from '@/theme/Pill';
import { NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { useSheetMotion } from './useSheetMotion';

export interface ShareSheetProps extends ShareIntentProps {
  /** System.currentTimeMillis() when ShareActivity was created. */
  readonly openedAt?: number;
}

/** A saved or re-shared link asks where it hangs; nothing else on the sheet can be filed. */
function takesChoice(opening: ShareOpening | null): opening is Extract<ShareOpening, { readonly collections: unknown }> {
  return opening?.kind === 'saved' || opening?.kind === 'existing';
}

/** The item the sheet files: the one it just saved, or the one the link already was (#19). */
function itemIdOf(opening: ShareOpening | null): string | null {
  if (opening?.kind === 'saved') return opening.itemId;
  return opening?.kind === 'existing' ? opening.item.id : null;
}

function Sheet({ openedAt, ...intent }: ShareSheetProps) {
  const styles = useStyles();
  const lift = useSheetLift(SHEET_PADDING_BOTTOM);
  const [share] = useState(() => parseShare(intent));
  const [capture] = useState(createAppShareCapture);
  const [opening, setOpening] = useState<ShareOpening | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const { created, draftError, setDraftError, createCollection } = useNewCollections(capture, setSelected);

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

  const choosing = takesChoice(opening);
  // A new share shows Save from the start (disabled until a pick); a re-shared one only once the pick would move it.
  const showsSave = opening?.kind === 'existing' ? canSave(opening, selected) : choosing;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Animated.View style={[StyleSheet.absoluteFill, styles.scrim, scrimStyle]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close(leaveInInbox)} accessibilityLabel="Leave it in Inbox" />
      </Animated.View>
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[styles.sheet, lift, sheetStyle]}
          onLayout={() => {
            if (__DEV__ && openedAt) console.info(`Share sheet laid out ${Date.now() - openedAt} ms after ShareActivity started`);
          }}
        >
          <View style={styles.handle} />
          <SheetPreview share={share} opening={opening} />
          {choosing && (
            <CollectionChips choices={[...opening.collections, ...created]} selected={selected ?? undefined} onSelect={setSelected} onCreate={createCollection} onDraftError={setDraftError} />
          )}
          <View style={styles.footer}>
            <NoteText style={styles.hint} color={draftError ? 'ink2' : 'ink3'}>{draftError ?? sheetHint(opening, selected)}</NoteText>
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
const SHEET_PADDING_BOTTOM = 20;

const useStyles = makeStyles(({ color }) => ({
  scrim: { backgroundColor: color.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.wall, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: SPACE.margin, paddingTop: 10 },
  handle: { alignSelf: 'center', ...HANDLE, borderRadius: RADIUS.print, backgroundColor: color.rule, marginBottom: SPACE.rhythm },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, gap: 12 },
  hint: { flex: 1 },
}));
