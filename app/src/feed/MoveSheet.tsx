import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CollectionChips } from '@/collections/CollectionChips';
import { appCollections } from '@/home/appListSources';
import { ScreeningRoom } from '@/theme/ScreeningRoom';
import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import type { FeedPage } from './feedPage';
import { moveChoices } from './moveChoices';

const SHEET_PADDING_TOP = 10;
const SHEET_PADDING_BOTTOM = 20;
const HANDLE = { width: 32, height: 4 } as const;

const useStyles = makeStyles(({ color }) => ({
  scrim: { backgroundColor: color.scrim },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: color.raised, borderTopLeftRadius: RADIUS.sheet, borderTopRightRadius: RADIUS.sheet, paddingHorizontal: SPACE.margin, paddingTop: SHEET_PADDING_TOP },
  handle: { alignSelf: 'center', ...HANDLE, borderRadius: RADIUS.print, backgroundColor: color.rule },
}));

interface MoveSheetProps {
  /** The page being moved; null keeps the sheet closed. */
  readonly page: FeedPage | null;
  readonly onChoose: (page: FeedPage, collectionId: string | null) => void;
  readonly onClose: () => void;
}

function Sheet({ page, onChoose, onClose }: MoveSheetProps & { readonly page: FeedPage }) {
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const choices = useMemo(() => moveChoices(appCollections.list()), []);
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={[StyleSheet.absoluteFill, styles.scrim]} onPress={onClose} accessibilityLabel="Keep it here" />
      <View testID="move-sheet" style={[styles.sheet, { paddingBottom: insets.bottom + SHEET_PADDING_BOTTOM }]}>
        <View style={styles.handle} />
        <CollectionChips choices={choices} selected={page.placeId} onSelect={(id) => onChoose(page, id)} />
      </View>
    </View>
  );
}

/** Move (#31): *Where does it hang?* with every collection and the Inbox; the current place is selected. */
export function MoveSheet(props: MoveSheetProps) {
  // A fade, not a slide: Modal slides the scrim along with the sheet.
  return (
    <Modal
      visible={props.page !== null}
      transparent
      statusBarTranslucent
      navigationBarTranslucent
      animationType="fade"
      onRequestClose={props.onClose}
    >
      <ScreeningRoom>{props.page ? <Sheet {...props} page={props.page} /> : null}</ScreeningRoom>
    </Modal>
  );
}
