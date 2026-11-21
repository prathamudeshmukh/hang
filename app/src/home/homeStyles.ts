import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { textStyle } from '@/theme/typeScale';

/** DESIGN.md Home sheet: a 76×98 strip print, a 62dp Rediscover print, 40dp collection covers, 88dp how-to prints (#75). */
export const HOME_SIZE = {
  howto: 88,
  stripWidth: 76,
  stripHeight: 98,
  rediscover: 62,
  cover: 40,
  inboxDot: 6,
} as const;

const SECTION_GAP = 18;
const STRIP_GAP = 8;
const ROW_GAP = 10;
const HOWTO_STEP_GAP = 12;
const HOWTO_TEXT_GAP = 14;
const ROW_PADDING = 9;
const FADED = 0.5;

const print = { borderRadius: RADIUS.print, overflow: 'hidden' } as const;

export const useHomeStyles = makeStyles(({ color }) => ({
  wall: { flex: 1, backgroundColor: color.wall },
  content: { paddingHorizontal: SPACE.margin },
  /** Today on a shade deeper wall (#79), bleeding to the screen edges and up behind the status bar. */
  featureWall: { backgroundColor: color.wallDeep, marginHorizontal: -SPACE.margin, paddingHorizontal: SPACE.margin, paddingBottom: SECTION_GAP },
  greeting: { marginTop: SPACE.caption },
  /** One style object: expo-router's `Link asChild` rejects style arrays. */
  sectionLabel: {
    marginTop: SECTION_GAP,
    minHeight: SPACE.touch,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionName: { flexDirection: 'row', alignItems: 'center', gap: SPACE.caption },
  inboxDot: { width: HOME_SIZE.inboxDot, height: HOME_SIZE.inboxDot, borderRadius: HOME_SIZE.inboxDot / 2, backgroundColor: color.accent },
  /** The strip bleeds to the screen edges and scrolls under them. */
  strip: { marginHorizontal: -SPACE.margin },
  stripContent: { paddingHorizontal: SPACE.margin, gap: STRIP_GAP },
  stripPrint: { width: HOME_SIZE.stripWidth },
  stripFrame: { ...print, width: HOME_SIZE.stripWidth, height: HOME_SIZE.stripHeight, backgroundColor: color.raised },
  stripText: { padding: SPACE.caption },
  stripPending: {
    ...print,
    width: HOME_SIZE.stripWidth,
    height: HOME_SIZE.stripHeight,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.ink3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  /** Fetching in a room (#85): its colour holds the place, no outline. */
  stripPendingFilled: { ...print, width: HOME_SIZE.stripWidth, height: HOME_SIZE.stripHeight, alignItems: 'center', justifyContent: 'center' },
  stripCaption: { marginTop: SPACE.caption },
  /** While the first pull runs: the strip's three places, dashed (#75). */
  waitingStrip: { flexDirection: 'row', gap: STRIP_GAP },
  /** The empty wall's how-to: a column of prints, each labelled beside it like a wall label (#75). */
  howto: { gap: HOWTO_STEP_GAP },
  howtoStep: { flexDirection: 'row', alignItems: 'center', gap: HOWTO_TEXT_GAP },
  howtoPrint: { ...print, width: HOME_SIZE.howto, height: HOME_SIZE.howto },
  printDot: { position: 'absolute', top: SPACE.tight, right: SPACE.tight },
  faded: { opacity: FADED },
  rediscover: { flexDirection: 'row', alignItems: 'center', gap: ROW_GAP },
  rediscoverFrame: { ...print, width: HOME_SIZE.rediscover, height: HOME_SIZE.rediscover, backgroundColor: color.raised },
  rowText: { flex: 1, gap: SPACE.hair },
  /** One style object: expo-router's `Link asChild` rejects style arrays. */
  collectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ROW_GAP,
    paddingVertical: ROW_PADDING,
    minHeight: SPACE.touch,
    borderTopWidth: 1,
    borderColor: color.rule,
  },
  cover: { ...print, width: HOME_SIZE.cover, height: HOME_SIZE.cover, backgroundColor: color.raised },
  coverInitial: { alignItems: 'center', justifyContent: 'center' },
  coverPlaceholder: { ...print, width: HOME_SIZE.cover, height: HOME_SIZE.cover, borderWidth: 1, borderStyle: 'dashed', borderColor: color.ink3 },
  collectionName: { flex: 1 },
  input: { ...textStyle('action'), color: color.ink, padding: 0, flex: 1 },
  footer: { marginTop: SPACE.screenBottom, paddingTop: SPACE.rhythm, borderTopWidth: 1, borderColor: color.rule, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  footerAction: { minHeight: SPACE.touch, justifyContent: 'center' },
}));
