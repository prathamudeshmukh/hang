import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { HAIRLINE, POST_IMPRINT_GAP, POST_PILLS_GAP, POST_SEAM_GAP, POST_WORDS_GAP } from './postLayout';

/** A post page (DESIGN.md §8 *Post pages*), drawn inside `ScreeningRoom`: `wall` is the screen, `ink` screen ink. */
export const usePostStyles = makeStyles(({ color }) => ({
  page: { backgroundColor: color.wall, paddingHorizontal: SPACE.margin },
  content: { flex: 1 },
  body: { flex: 1, paddingTop: POST_WORDS_GAP, paddingBottom: POST_PILLS_GAP },
  measuring: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0 },
  measured: { position: 'absolute', left: 0, right: 0 },
  unsettled: { opacity: 0 },
  imprint: { marginTop: POST_IMPRINT_GAP },
  handle: { color: color.ink3 },
  seam: { height: HAIRLINE, backgroundColor: color.rule, marginVertical: POST_SEAM_GAP },
  picture: { borderRadius: RADIUS.print, overflow: 'hidden', backgroundColor: color.raised },
  fill: { width: '100%', height: '100%' },
  pills: { flexDirection: 'row', gap: SPACE.chip },
  hidden: { opacity: 0 },
}));
