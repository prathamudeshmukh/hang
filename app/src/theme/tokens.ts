/** DESIGN.md §3 (color), §5 (shape), §7 (motion) as data. Nothing outside src/theme hard-codes these values. */

export type Scheme = 'light' | 'dark';

export interface Palette {
  readonly wall: string;
  readonly raised: string;
  readonly rule: string;
  readonly ink: string;
  readonly ink2: string;
  readonly ink3: string;
  /** Vermilion: only the five uses DESIGN.md §3 lists. */
  readonly accent: string;
  /** Screening room: always dark (feed, video). */
  readonly screen: string;
  readonly screenInk: string;
  /** Behind the share sheet. */
  readonly scrim: string;
  /** Touch ripple: ink at 8% (DESIGN.md §2). */
  readonly ripple: string;
}

const SCREEN = { screen: '#0B0B0A', screenInk: '#F2EFE8', scrim: 'rgba(0,0,0,0.4)' } as const;

export const PALETTES: Readonly<Record<Scheme, Palette>> = {
  light: {
    wall: '#F7F5F0',
    raised: '#FFFFFF',
    rule: '#E4E0D7',
    ink: '#1B1A17',
    ink2: '#55514A',
    ink3: '#736E66',
    accent: '#D2462A',
    ripple: 'rgba(27,26,23,0.08)',
    ...SCREEN,
  },
  dark: {
    wall: '#161514',
    raised: '#1F1E1C',
    rule: '#2C2A27',
    ink: '#EDEAE3',
    ink2: '#B4AEA3',
    ink3: '#9A958B',
    accent: '#E25A3E',
    ripple: 'rgba(237,234,227,0.08)',
    ...SCREEN,
  },
};

export const RADIUS = { print: 2, sheet: 24, pill: 999 } as const;

/** Grid and screen rhythm (DESIGN.md §8). */
export const SPACE = { margin: 16, gutter: 10, rhythm: 14, touch: 48 } as const;

export const MOTION = {
  quickMs: 180,
  baseMs: 340,
  slowMs: 600,
  /** Calm ease-out; no bounce or overshoot anywhere. */
  easing: [0.2, 0.7, 0.1, 1] as const,
} as const;
