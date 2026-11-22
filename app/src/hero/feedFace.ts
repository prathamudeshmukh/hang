import type { PrintSwatch } from '../rooms/roomOf.ts';
import { SCREENING_ROOM } from '../theme/tokens.ts';
import type { Landing } from './geometry.ts';

/** The screening room is always dark, so a print's room colour there is its dark one (#109). */
const SCREEN_SCHEME = 'dark';

interface Landed {
  readonly landing: Landing;
  /** The print's room colour; null for an unsorted print. */
  readonly paper: PrintSwatch | null;
}

/** A frame flyer's colour where it lands on the feed, so the swap with the page underneath is seamless. */
export function feedFace({ landing, paper }: Landed): string {
  if (landing.fit === 'words') return SCREENING_ROOM.wall;
  if (landing.fit === 'page') return paper?.[SCREEN_SCHEME].top ?? SCREENING_ROOM.raised;
  return SCREENING_ROOM.raised;
}
