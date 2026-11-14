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
  /** Disc behind the play icon on a video card, so it reads over any thumbnail. */
  readonly veil: string;
  /** Touch ripple: ink at 8% (DESIGN.md §2). */
  readonly ripple: string;
}

const SCREEN = { screen: '#0B0B0A', screenInk: '#F2EFE8', scrim: 'rgba(0,0,0,0.4)', veil: 'rgba(11,11,10,0.45)' } as const;

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

/** The feed and its sheets (DESIGN.md §3 "always dark"): the dark theme on the screen colors. */
export const SCREENING_ROOM: Palette = { ...PALETTES.dark, wall: SCREEN.screen, ink: SCREEN.screenInk };

export const RADIUS = { print: 2, sheet: 24, pill: 999 } as const;

/** Grid and screen rhythm (DESIGN.md §8). */
export const SPACE = {
  margin: 16,
  gutter: 10,
  rhythm: 14,
  touch: 48,
  /** Inside a card: note under title, caption under media, padding of a text card. */
  hair: 2,
  tight: 4,
  caption: 6,
  inset: 12,
  /** Between chips in a row. */
  chip: 8,
  /** Above a screen's title and below its last item, past the system bars. */
  screenTop: 24,
  screenBottom: 40,
} as const;

/** Drawn lines that aren't hairlines. */
export const STROKE = {
  /** Under a collection's title (DESIGN.md §7 "Entering a room"). */
  underline: 2,
  /** The vermilion stroke through "unread" on a read item. */
  finish: 1.5,
} as const;

export const MOTION = {
  quickMs: 180,
  baseMs: 340,
  slowMs: 600,
  /** A thumbnail cross-fading over its dashed box (DESIGN.md §7 "fetching fills in"). */
  fillInMs: 700,
  /** Today's Rediscover print developing (DESIGN.md §7). */
  develop: { durationMs: 1600, blur: 8, brightness: 1.3 },
  /** Calm ease-out; no bounce or overshoot anywhere. */
  easing: [0.2, 0.7, 0.1, 1] as const,
  /**
   * The hero flyer only (#33): the calm ease-out front-loads a long trip, so the print seemed to jump and then
   * drift. Each direction has its own curve; the ground under it keeps `easing` over the same duration.
   */
  flight: {
    out: [0.3, 0, 0.1, 1] as const,
    back: [0.3, 0, 0.1, 1] as const,
    durationMs: 340,
    /** The feed's text leaving alongside the flight back. */
    textFadeMs: 180,
  },
} as const;
