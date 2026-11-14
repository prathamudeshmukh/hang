import { useState } from 'react';
import { View } from 'react-native';
import { NoteText } from '@/theme/Text';
import { makeStyles } from '@/theme/theme';
import { SPACE, STROKE } from '@/theme/tokens';
import type { ExistingOpening } from './shareCapture';
import { existingNote } from './sheetNote';

/** Where the stroke crosses the italic x-height. */
const STRIKE_AT = '55%';

const useStyles = makeStyles(({ color }) => ({
  line: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' },
  struck: { marginRight: SPACE.caption },
  stroke: { position: 'absolute', left: -1, right: -1, top: STRIKE_AT, height: STROKE.finish, backgroundColor: color.accent },
}));

/** "already hanging in Tech · since 3 Nov", or a read one's struck "unread" (DESIGN.md §3: the finish stroke). */
export function ExistingNoteText({ opening }: { readonly opening: ExistingOpening }) {
  const styles = useStyles();
  const [today] = useState(() => new Date());
  const { struck, text } = existingNote(opening, today);
  if (struck === null) return <NoteText>{text}</NoteText>;
  return (
    <View style={styles.line} accessible accessibilityLabel={text}>
      <View style={styles.struck}>
        <NoteText>{struck}</NoteText>
        <View style={styles.stroke} />
      </View>
      <NoteText>{text}</NoteText>
    </View>
  );
}
