import { makeStyles } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { TEXT_PILLS_GAP } from '../text/textLayout';

/** A label page (#109), drawn inside `ScreeningRoom`: plain `raised` paper unless its room colour replaces it. */
export const useLabelPageStyles = makeStyles(({ color }) => ({
  page: { backgroundColor: color.raised, paddingHorizontal: SPACE.margin },
  /** What the note and pills leave; the title and description sit centred in it. */
  room: { flex: 1, justifyContent: 'center', paddingBottom: TEXT_PILLS_GAP },
  label: { gap: SPACE.rhythm },
  pills: { flexDirection: 'row', gap: SPACE.chip },
  hidden: { opacity: 0 },
}));
