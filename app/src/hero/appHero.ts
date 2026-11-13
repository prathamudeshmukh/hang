import { AccessibilityInfo, Dimensions } from 'react-native';
import { pushFeedRoute } from '@/feed/appFeed';
import type { Size } from './geometry';
import { nextFrame } from './frames';
import { createHero } from './hero';
import { createOrigins } from './origins';

export const heroOrigins = createOrigins();

let reduceMotion = false;
let lastFeedSize: Size | null = null;

const warn = (message: string) => console.warn(message);

AccessibilityInfo.isReduceMotionEnabled()
  .then((enabled) => {
    reduceMotion = enabled;
  })
  .catch((error: unknown) => warn(`Could not read reduce motion: ${String(error)}`));
AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
  reduceMotion = enabled;
});

/** The feed reports its laid-out size, so later flights land on its real media box, not an estimate. */
export function rememberFeedSize(size: Size): void {
  lastFeedSize = size;
}

export const hero = createHero({
  origins: heroOrigins,
  pushFeed: pushFeedRoute,
  reduceMotion: () => reduceMotion,
  feedSize: () => lastFeedSize ?? Dimensions.get('window'),
  delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  nextFrame,
  warn,
});
