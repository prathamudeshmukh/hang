import { Easing } from 'react-native-reanimated';

/** The share sheet's own motion and sizes; colors, type and radii come from src/theme. */
export const MOTION = {
  sheetInMs: 280,
  sheetOutMs: 200,
  scrimMs: 180,
  easing: Easing.bezier(0.2, 0.7, 0.1, 1),
} as const;

export const SHEET = {
  printSize: 50,
  /** Drag further than this (or fling faster than the velocity) to leave the item in Inbox. */
  dismissDistance: 120,
  dismissVelocity: 800,
} as const;
