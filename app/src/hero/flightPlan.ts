import { MOTION } from '../theme/tokens.ts';
import type { Direction } from './trip.ts';

/** A cubic-bezier's control points, x1 y1 x2 y2. */
export type Curve = readonly [number, number, number, number];

/** `calm`: the ground keeps the calm ease-out; `linked`: it moves on the flyer's curve. */
export type GroundCurve = 'calm' | 'linked';

export interface FlightTuning {
  readonly out: Curve;
  readonly back: Curve;
  readonly durationMs: number;
  readonly textFadeMs: number;
  readonly ground: GroundCurve;
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

export const DEFAULT_TUNING: FlightTuning = { ...MOTION.flight, ground: 'calm' };

export function flightPlan(tuning: FlightTuning, direction: Direction): FlightPlan {
  const curve = direction === 'out' ? tuning.out : tuning.back;
  return {
    flyer: { durationMs: tuning.durationMs, curve },
    ground: { durationMs: tuning.durationMs, curve: tuning.ground === 'linked' ? curve : MOTION.easing },
    text: { durationMs: tuning.textFadeMs, curve: MOTION.easing },
  };
}
