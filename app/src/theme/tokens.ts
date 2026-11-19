/** DESIGN.md §3 (color), §5 (shape), §7 (motion) as data. Nothing outside src/theme hard-codes these values. */

export type Scheme = 'light' | 'dark';

export interface Palette {
  /** Sage room (#79): the pale grey-green of a print room; green-black ink. */
  readonly wall: string;
  /** The feature wall: a shade deeper, behind Home's Today (Recently saved, Rediscover). A tone, never an accent. */
  readonly wallDeep: string;
  readonly raised: string;
  readonly rule: string;
  readonly ink: string;
  readonly ink2: string;
  readonly ink3: string;
  /** Vermilion: only the five uses DESIGN.md §3 lists. */
  readonly accent: string;
  /** The label on an accent pill (Save, Take down), at AA on `accent`. */
  readonly onAccent: string;
  /** Screening room: always dark (feed, video). */
  readonly screen: string;
  readonly screenInk: string;
  /** Outlines in the screening room (Later, Move): screen ink at 30%. */
  readonly screenRule: string;
  /** Behind the share sheet. */
  readonly scrim: string;
  /** Disc behind the play icon on a video card, so it reads over any thumbnail. */
  readonly veil: string;
  /** Touch ripple: ink at 8% (DESIGN.md §2). */
  readonly ripple: string;
}

const SCREEN = {
  screen: '#080A09',
  screenInk: '#EEF2EC',
  screenRule: 'rgba(238,242,236,0.3)',
  scrim: 'rgba(8,10,9,0.4)',
  veil: 'rgba(8,10,9,0.45)',
} as const;

export const PALETTES: Readonly<Record<Scheme, Palette>> = {
  light: {
    wall: '#EDF0EA',
    wallDeep: '#E2E7DE',
    raised: '#F9FAF6',
    rule: '#D6DCD2',
    ink: '#151D18',
    ink2: '#46524A',
    ink3: '#5A665E',
    accent: '#C23B20',
    onAccent: '#FFFFFF',
    ripple: 'rgba(21,29,24,0.08)',
    ...SCREEN,
  },
  dark: {
    wall: '#161C18',
    wallDeep: '#111612',
    raised: '#202823',
    rule: '#323C35',
    ink: '#E6ECE6',
    ink2: '#AAB6AD',
    ink3: '#8F9C92',
    accent: '#F0714F',
    onAccent: '#111613',
    ripple: 'rgba(230,236,230,0.08)',
    ...SCREEN,
  },
};

/** The feed and its sheets (DESIGN.md §3 "always dark"): the dark theme on the screen colors, outlined in screen rule. */
export const SCREENING_ROOM: Palette = { ...PALETTES.dark, wall: SCREEN.screen, ink: SCREEN.screenInk, rule: SCREEN.screenRule };

/**
 * The empty Home's how-to drawings (#75): another app's page in flat blocks of ink, on a print's `raised` paper.
 * The sample picture is a washed teal from the mark; with the mark itself, the only colour on the wall.
 */
export interface SketchPalette {
  /** Faint blocks: body text, the room around a share sheet. */
  readonly faint: string;
  /** Firm blocks: buttons, headlines, the other apps in the share row. */
  readonly firm: string;
  /** The share sheet rising over the page. */
  readonly sheet: string;
  /** The halo round what to tap. */
  readonly halo: string;
  readonly picture: string;
  readonly pictureShade: string;
}

export const SKETCH: Readonly<Record<Scheme, SketchPalette>> = {
  light: {
    faint: 'rgba(21,29,24,0.11)',
    firm: 'rgba(21,29,24,0.24)',
    sheet: '#FFFFFF',
    halo: 'rgba(21,29,24,0.10)',
    picture: '#B9CFC9',
    pictureShade: '#8FB0A8',
  },
  dark: {
    faint: 'rgba(230,236,230,0.12)',
    firm: 'rgba(230,236,230,0.26)',
    sheet: '#2B342E',
    halo: 'rgba(230,236,230,0.14)',
    picture: '#2E4A45',
    pictureShade: '#3F6A62',
  },
};

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
