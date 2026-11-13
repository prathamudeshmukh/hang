import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';

const PLAY_DISC = SPACE.touch * 1.5;
const FADED = 0.5;
const COUNTER_PADDING_X = 10;

/** Drawn inside `ScreeningRoom`, so `wall` is the screen color and `ink` is screen ink. */
export const useFeedStyles = makeStyles(({ color }) => ({
  screen: { flex: 1, backgroundColor: color.wall },
  page: { backgroundColor: color.wall },
  media: { width: '100%', backgroundColor: color.raised, overflow: 'hidden' },
  picture: { width: '100%', height: '100%' },
  letterbox: { backgroundColor: color.wall },
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
  titleMedia: { justifyContent: 'flex-end', padding: SPACE.margin, paddingBottom: SPACE.rhythm * 2 },
  /** Post text between two hairline rules (DESIGN.md §5), its media under it. */
  post: { padding: SPACE.margin, gap: SPACE.rhythm, backgroundColor: color.wall },
  postText: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.rule, paddingVertical: SPACE.inset },
  postPicture: { flex: 1 },
  pendingFrame: { flex: 1, padding: SPACE.margin, backgroundColor: color.wall },
  pending: {
    flex: 1,
    borderRadius: RADIUS.print,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink3,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACE.margin,
    gap: SPACE.caption,
  },
  faded: { opacity: FADED },
  /** The flyer stands in for it on the way back (#33). */
  hidden: { opacity: 0 },
  text: { flex: 1, justifyContent: 'space-between', paddingHorizontal: SPACE.margin, paddingTop: SPACE.rhythm },
  words: { gap: SPACE.caption },
  pills: { flexDirection: 'row', gap: SPACE.chip },
  counter: {
    position: 'absolute',
    right: SPACE.margin,
    borderRadius: RADIUS.pill,
    backgroundColor: color.veil,
    paddingHorizontal: COUNTER_PADDING_X,
    paddingVertical: SPACE.tight,
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: SPACE.margin },
}));
