import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { TEXT_PILLS_GAP } from './text/textLayout';

const PLAY_DISC = SPACE.touch * 1.5;
const FADED = 0.5;
const COUNTER_PADDING_X = 10;

/** Drawn inside `ScreeningRoom`, so `wall` is the screen color and `ink` is screen ink. */
export const useFeedStyles = makeStyles(({ color }) => ({
  screen: { flex: 1, backgroundColor: color.wall },
  page: { backgroundColor: color.wall },
  media: { width: '100%', backgroundColor: color.raised, overflow: 'hidden' },
  /** A picture drawn whole sits on its own glow, not on a raised box (#95). */
  mediaOpen: { backgroundColor: 'transparent' },
  picture: { width: '100%', height: '100%' },
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
  /** Short words sit on the pills, so the room left opens under the picture, where its light spills (#108). */
  text: { flex: 1, justifyContent: 'flex-end', paddingHorizontal: SPACE.margin, paddingTop: SPACE.rhythm },
  words: { gap: SPACE.caption, marginBottom: SPACE.rhythm },
  /** An article's opening takes the room the pills leave (#61). */
  wordsFilling: { flex: 1, marginBottom: TEXT_PILLS_GAP },
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
