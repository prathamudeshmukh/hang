import { Easing } from 'react-native-reanimated';

/** Subset of DESIGN.md tokens needed to judge motion in context. Light wall only. */
export const COLOR = {
  wall: '#F7F5F0',
  ink: '#1B1A17',
  ink3: '#736E66',
  rule: '#E4E0D7',
  screen: '#0B0B0A',
  screenInk: '#F2EFE8',
  accent: '#D2462A',
} as const;

export const MOTION = {
  baseMs: 340,
  quickMs: 180,
  textDelayMs: 60,
  /** DESIGN.md §7: calm ease-out, no bounce. */
  easing: Easing.bezier(0.2, 0.7, 0.1, 1),
} as const;

export const LAYOUT = {
  margin: 16,
  gutter: 10,
  columns: 2,
  feedMediaRatio: 0.56,
  readerHeroHeight: 300,
  printRadius: 2,
} as const;

export const FONT = {
  serif: 'serif',
} as const;
