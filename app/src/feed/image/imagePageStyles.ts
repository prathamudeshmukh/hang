import { makeStyles } from '@/theme/theme';
import { SPACE } from '@/theme/tokens';

/** Room above the note for the shade to fade in, so its top edge never shows over the image. */
const SHADE_LEAD = SPACE.touch * 2;

export const useImagePageStyles = makeStyles(({ color }) => ({
  page: { backgroundColor: color.wall },
  chrome: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACE.margin,
    paddingTop: SHADE_LEAD,
    gap: SPACE.rhythm,
  },
  words: { gap: SPACE.caption },
  pills: { flexDirection: 'row', gap: SPACE.chip },
  /** The flyer stands in for it on the way back (#33). */
  hidden: { opacity: 0 },
}));
