import { AccessibilityInfo, Dimensions, PixelRatio, StatusBar } from 'react-native';
import { pushFeedRoute } from '@/feed/appFeed';
import { postWordsTop } from '@/feed/post/postLayout';
import type { FeedFrame } from './geometry';
import { nextFrame } from './frames';
import { createHero } from './hero';
import { createOrigins } from './origins';

export const heroOrigins = createOrigins();

let reduceMotion = false;
let lastFeedFrame: FeedFrame | null = null;

const warn = (message: string) => console.warn(message);

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch((error: unknown) => warn(`Could not read reduce motion: ${String(error)}`));
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

/** The feed reports its laid-out frame, so later flights land on its real media box, not an estimate. */
export function rememberFeedFrame(frame: FeedFrame): void {
  lastFeedFrame = frame;
}

/** Before the feed has ever laid out: the window, under an edge-to-edge status bar. */
export function windowFeedFrame(): FeedFrame {
  const { width, height } = Dimensions.get('window');
  return { width, height, wordsTop: postWordsTop({ topInset: StatusBar.currentHeight ?? 0, fontScale: PixelRatio.getFontScale() }) };
}

export const hero = createHero({
  origins: heroOrigins,
  pushFeed: pushFeedRoute,
  reduceMotion: () => reduceMotion,
  feedSize: () => lastFeedFrame ?? windowFeedFrame(),
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nextFrame,
  warn,
});
