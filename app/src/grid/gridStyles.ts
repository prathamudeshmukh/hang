import { StyleSheet } from 'react-native';
import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';

const PLAY_DISC = SPACE.touch;
const PENDING_RATIO = 4 / 5;
const FADED = 0.5;

/** DESIGN.md §8 masonry: the gutter is split between neighbours so both columns stay equal. */
export const useGridStyles = makeStyles(({ color }) => ({
  wall: { flex: 1, backgroundColor: color.wall },
  content: { paddingHorizontal: SPACE.margin - SPACE.gutter / 2 },
  header: { paddingHorizontal: SPACE.gutter / 2, paddingBottom: SPACE.rhythm * 2, gap: SPACE.tight },
  /** As wide as the title, so its underline is too. */
  title: { alignSelf: 'flex-start', gap: SPACE.tight },
  cell: { paddingHorizontal: SPACE.gutter / 2, paddingBottom: SPACE.rhythm },
  /** The ripple stays on the card, not the gutter around it. */
  pressable: { borderRadius: RADIUS.print, overflow: 'hidden' },
  caption: { marginTop: SPACE.caption, gap: SPACE.hair },
  /** Content keeps square-ish `print` corners and waits on `raised` until its image lands. */
  media: { width: '100%', borderRadius: RADIUS.print, overflow: 'hidden', backgroundColor: color.raised },
  /** Waiting for its thumbnail: no fill, a dashed outline the image cross-fades over. */
  mediaWaiting: { backgroundColor: 'transparent' },
  dashed: { ...StyleSheet.absoluteFill, borderRadius: RADIUS.print, borderWidth: 1, borderStyle: 'dashed', borderColor: color.ink3 },
  image: { width: '100%', height: '100%' },
  playDisc: {
    position: 'absolute',
    alignSelf: 'center',
    top: '50%',
    width: PLAY_DISC,
    height: PLAY_DISC,
    marginTop: -PLAY_DISC / 2,
    borderRadius: PLAY_DISC / 2,
    backgroundColor: color.veil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textCard: { borderRadius: RADIUS.print, backgroundColor: color.raised, padding: SPACE.inset, gap: SPACE.inset },
  /** Post cards are drawn with top and bottom rules, not boxes (DESIGN.md §5). */
  post: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.rule, paddingVertical: SPACE.inset },
  postMedia: { marginTop: SPACE.caption },
  pending: {
    aspectRatio: PENDING_RATIO,
    borderRadius: RADIUS.print,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faded: { opacity: FADED },
}));
