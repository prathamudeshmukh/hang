import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { textStyle } from '@/theme/typeScale';

const THUMB_SIZE = 56;
const SECTION_GAP = 32;

/** Phase 1 plain lists on the Phase 2 foundations; slices 4–5 replace the layout. */
export const useListStyles = makeStyles(({ color }) => ({
  wall: { flex: 1, backgroundColor: color.wall },
  content: { paddingHorizontal: SPACE.margin },
  section: { marginTop: SECTION_GAP, marginBottom: 4 },
  row: { borderTopWidth: 1, borderColor: color.rule, paddingVertical: SPACE.rhythm, flexDirection: 'row', gap: 12 },
  rowText: { flex: 1, gap: 4 },
  /** DESIGN.md §5: content has square corners (2px `print`). */
  thumb: { width: THUMB_SIZE, height: THUMB_SIZE, borderRadius: RADIUS.print, backgroundColor: color.rule },
  /** One style object: expo-router's `Link asChild` rejects style arrays. */
  placeRow: {
    borderTopWidth: 1,
    borderColor: color.rule,
    paddingVertical: SPACE.rhythm,
    minHeight: SPACE.touch,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  input: { ...textStyle('action'), color: color.ink, padding: 0 },
}));
