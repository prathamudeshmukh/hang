import { Image } from 'expo-image';
import { View } from 'react-native';
import type { ParsedShare } from './parseShare';
import type { ShareOpening } from './shareCapture';
import { ExistingNoteText } from './ExistingNoteText';
import { sheetNote } from './sheetNote';
import { NameText, NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { RADIUS } from '@/theme/tokens';
import { SHEET } from './tokens';

function hostOf(url: string | undefined): string {
  try {
    return url ? new URL(url).hostname.replace(/^www\./, '') : 'image';
  } catch {
    return 'link';
  }
}

const useStyles = makeStyles(({ color }) => ({
  preview: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  print: { width: SHEET.printSize, height: SHEET.printSize, borderRadius: RADIUS.print },
  printEmpty: { borderWidth: 1, borderStyle: 'dashed', borderColor: color.ink3 },
  previewText: { flex: 1, gap: 2 },
}));

/** The print, title and note at the top of the share sheet: what was shared, or what Hang already has (#19). */
export function SheetPreview({ share, opening }: { readonly share: ParsedShare; readonly opening: ShareOpening | null }) {
  const styles = useStyles();
  const host = hostOf(share.url);
  const existing = opening?.kind === 'existing' ? opening : null;
  const printUri = existing ? existing.item.thumbUri : share.imageUri;
  const title = existing?.item.title ?? share.sharedTitle ?? (share.kind === 'unsupported' ? 'No link in this share' : host);
  return (
    <View style={styles.preview}>
      {printUri ? <Image source={printUri} style={styles.print} contentFit="cover" /> : <View style={[styles.print, styles.printEmpty]} />}
      <View style={styles.previewText}>
        <NameText token="titleS" numberOfLines={2}>{title}</NameText>
        {existing ? <ExistingNoteText opening={existing} /> : <NoteText>{sheetNote(opening, host)}</NoteText>}
      </View>
    </View>
  );
}
