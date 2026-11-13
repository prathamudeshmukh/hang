import { MOTION } from '../theme/tokens.ts';
import type { Direction } from './trip.ts';

/** A cubic-bezier's control points, x1 y1 x2 y2. */
export type Curve = readonly [number, number, number, number];

export interface FlightTuning {
  readonly out: Curve;
  readonly back: Curve;
  readonly durationMs: number;
  readonly textFadeMs: number;
}

export interface Timing {
  readonly durationMs: number;
  readonly curve: Curve;
}

/**
 * What moves during one flight: the flyer, the ground under it (the backdrop going out, the feed itself going
 * back) and the feed's text going back.
 */
export interface FlightPlan {
  readonly flyer: Timing;
  readonly ground: Timing;
  readonly text: Timing;
}

export const DEFAULT_TUNING: FlightTuning = MOTION.flight;

export function flightPlan(tuning: FlightTuning, direction: Direction): FlightPlan {
  return {
    flyer: { durationMs: tuning.durationMs, curve: direction === 'out' ? tuning.out : tuning.back },
    // The ground keeps the calm curve: a fade on the flyer's slow-starting curve leaves the wall up too long.
    ground: { durationMs: tuning.durationMs, curve: MOTION.easing },
    text: { durationMs: tuning.textFadeMs, curve: MOTION.easing },
  };
}
