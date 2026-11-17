import { makeStyles } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';
import { TEXT_PILLS_GAP } from './textLayout';

/** An imageless article's page (#61), drawn inside `ScreeningRoom`: `wall` is the screen, `ink` screen ink. */
export const useTextPageStyles = makeStyles(({ color }) => ({
  page: { backgroundColor: color.wall, paddingHorizontal: SPACE.margin },
  block: { flex: 1, gap: SPACE.caption, paddingBottom: TEXT_PILLS_GAP },
  /** Fills what the note and title leave; its height decides how many lines show. */
  opening: { flex: 1, overflow: 'hidden' },
  pills: { flexDirection: 'row', gap: SPACE.chip },
  hidden: { opacity: 0 },
}));
