/** Projector spill (#79): the page's own picture, blurred and mirrored, glowing faintly under the media box. */
export const SPILL = {
  /** How far down the room below the media the glow runs. */
  reach: 0.7,
  opacity: 0.32,
  blurRadius: 40,
} as const;

export interface SpillRect {
  readonly top: number;
  readonly height: number;
}

interface PageRoom {
  readonly pageHeight: number;
  readonly mediaHeight: number;
}

/** Where the glow sits: from the foot of the media box, part way down what's left of the page. */
export function spillRect({ pageHeight, mediaHeight }: PageRoom): SpillRect {
  const below = Math.max(0, pageHeight - mediaHeight);
  return { top: mediaHeight, height: Math.round(below * SPILL.reach) };
}
