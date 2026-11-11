import { Easing } from 'react-native-reanimated';

/** Subset of DESIGN.md tokens used by the share sheet spike (light wall). */
export const COLOR = {
  wall: '#F7F5F0',
  raised: '#FFFFFF',
  ink: '#1B1A17',
  ink3: '#736E66',
  rule: '#E4E0D7',
  accent: '#D2462A',
  scrim: 'rgba(0,0,0,0.4)',
} as const;

export const MOTION = {
  sheetInMs: 280,
  sheetOutMs: 200,
  scrimMs: 180,
  easing: Easing.bezier(0.2, 0.7, 0.1, 1),
} as const;

export const SHEET = {
  radius: 24,
  printSize: 50,
  printRadius: 2,
  /** Drag further than this (or fling faster than the velocity) to leave the item in Inbox. */
  dismissDistance: 120,
  dismissVelocity: 800,
} as const;

export const FONT = { serif: 'serif' } as const;

