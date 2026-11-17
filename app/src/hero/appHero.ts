import { AccessibilityInfo, Dimensions, PixelRatio } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { feedContent, pushFeedRoute } from '@/feed/appFeed';
import { feedBottomInset } from '@/feed/feedLayout';
import { postWordsTop } from '@/feed/post/postLayout';
import { textBlockBottom, textBlockTop } from '@/feed/text/textLayout';
import type { FeedFrame, Size } from './geometry';
import { nextFrame } from './frames';
import { createHero } from './hero';
import { createOrigins } from './origins';

export const heroOrigins = createOrigins();

let reduceMotion = false;
interface FeedLayout extends Size {
  readonly topInset: number;
  /** The room kept under the pills. */
  readonly bottomInset: number;
}

/** The feed as last laid out, with the insets it was laid out under. */
let lastFeed: FeedLayout | null = null;

const warn = (message: string) => console.warn(message);

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch((error: unknown) => warn(`Could not read reduce motion: ${String(error)}`));
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

/** The feed reports its laid-out size and insets, so later flights land on its real media box, not an estimate. */
export function rememberFeedLayout(layout: FeedLayout): void {
  lastFeed = layout;
}

/**
 * Where flights land now. The words' top is worked out at each read from the current font scale, so a change
 * of system font size since the feed last laid out still lands on the words (#59). Until the feed has laid
 * out: the window, under the launch's safe-area inset.
 */
export function feedFrame(): FeedFrame {
  const launch = initialWindowMetrics?.insets;
  const { width, height, topInset, bottomInset } = lastFeed ?? {
    ...Dimensions.get('window'),
    topInset: launch?.top ?? 0,
    bottomInset: feedBottomInset(launch?.bottom ?? 0),
  };
  return {
    width,
    height,
    wordsTop: postWordsTop({ topInset, fontScale: PixelRatio.getFontScale() }),
    textTop: textBlockTop(topInset),
    textBottom: textBlockBottom({ height, bottomInset }),
  };
}

export const hero = createHero({
  origins: heroOrigins,
  pushFeed: pushFeedRoute,
  reduceMotion: () => reduceMotion,
  feedSize: feedFrame,
  hasOpening: (id) => feedContent.hasOpening(id),
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nextFrame,
  warn,
});
