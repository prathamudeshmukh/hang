import { AccessibilityInfo, Dimensions, PixelRatio } from 'react-native';
import { initialWindowMetrics } from 'react-native-safe-area-context';
import { pushFeedRoute } from '@/feed/appFeed';
import { postWordsTop } from '@/feed/post/postLayout';
import type { FeedFrame, Size } from './geometry';
import { nextFrame } from './frames';
import { createHero } from './hero';
import { createOrigins } from './origins';

export const heroOrigins = createOrigins();

let reduceMotion = false;
/** The feed as last laid out, with the top inset it was laid out under. */
let lastFeed: (Size & { readonly topInset: number }) | null = null;

const warn = (message: string) => console.warn(message);

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch((error: unknown) => warn(`Could not read reduce motion: ${String(error)}`));
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

/** The feed reports its laid-out size and top inset, so later flights land on its real media box, not an estimate. */
export function rememberFeedLayout(layout: Size & { readonly topInset: number }): void {
  lastFeed = layout;
}

/**
 * Where flights land now. The words' top is worked out at each read from the current font scale, so a change
 * of system font size since the feed last laid out still lands on the words (#59). Until the feed has laid
 * out: the window, under the launch's safe-area inset.
 */
export function feedFrame(): FeedFrame {
  const { width, height, topInset } = lastFeed ?? { ...Dimensions.get('window'), topInset: initialWindowMetrics?.insets.top ?? 0 };
  return { width, height, wordsTop: postWordsTop({ topInset, fontScale: PixelRatio.getFontScale() }) };
}

export const hero = createHero({
  origins: heroOrigins,
  pushFeed: pushFeedRoute,
  reduceMotion: () => reduceMotion,
  feedSize: feedFrame,
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nextFrame,
  warn,
});
