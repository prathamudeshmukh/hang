import type { Rect } from './geometry.ts';
import { FRAME, type Look } from './look.ts';
import type { FaceKey, Scope } from './origins.ts';

export type Direction = 'out' | 'back';

/** One item flying between a print on a wall (or strip) and the feed's media box. */
export interface Flight {
  readonly id: string;
  /** The wall whose print it flies from (going out) or to (coming back). */
  readonly scope: Scope;
  readonly direction: Direction;
  readonly look: Look;
  readonly from: Rect;
  readonly to: Rect;
}

type FlightPhase = 'boarding' | 'flying' | 'settling' | 'leaving';

/**
 * Spike 0b's machine, plus the end of the trip (#32):
 * boarding → flyer parked on the source, waiting for its image to be drawn
 * flying   → animating on the UI thread
 * settling → landed, waiting for the destination image to be drawn under the flyer
 * leaving  → the flyer (and, going out, the backdrop) fading off the destination
 * fading   → no flyer: a plain cross-fade (reduce motion, or nothing to land on)
 */
export type Trip =
  | { readonly phase: 'idle' }
  | { readonly phase: FlightPhase; readonly flight: Flight; readonly destinationDrawn: boolean }
  | { readonly phase: 'fading'; readonly direction: Direction; readonly durationMs: number };

export type TripEvent =
  | { readonly type: 'board'; readonly flight: Flight }
  | { readonly type: 'fade'; readonly direction: Direction; readonly durationMs: number }
  | { readonly type: 'flyerDrawn' }
  | { readonly type: 'boardingTimedOut' }
  | { readonly type: 'landed' }
  | { readonly type: 'destinationDrawn' }
  | { readonly type: 'settleTimedOut' }
  | { readonly type: 'cleared' }
  /** Something failed mid-trip: put everything down rather than block input for good. */
  | { readonly type: 'abort' };

export const IDLE: Trip = { phase: 'idle' };

type InFlight = Extract<Trip, { readonly flight: Flight }>;

function fromIdle(event: TripEvent): Trip {
  if (event.type === 'board') return { phase: 'boarding', flight: event.flight, destinationDrawn: false };
  if (event.type === 'fade') return { phase: 'fading', direction: event.direction, durationMs: event.durationMs };
  return IDLE;
}

function afterLanding(trip: InFlight): InFlight {
  return { ...trip, phase: trip.destinationDrawn ? 'leaving' : 'settling' };
}

/** The phase each in-flight event moves to; anything missing leaves the trip as it is. */
const FLIGHT_STEPS: Readonly<Record<FlightPhase, Partial<Record<TripEvent['type'], (trip: InFlight) => InFlight>>>> = {
  boarding: {
    flyerDrawn: (trip) => ({ ...trip, phase: 'flying' }),
    boardingTimedOut: (trip) => ({ ...trip, phase: 'flying', flight: { ...trip.flight, look: FRAME } }),
  },
  flying: { landed: afterLanding },
  settling: {
    destinationDrawn: (trip) => ({ ...trip, phase: 'leaving', destinationDrawn: true }),
    settleTimedOut: (trip) => ({ ...trip, phase: 'leaving' }),
  },
  leaving: {},
};

/** Pure: the trip after one event. Events that don't fit the phase return the same trip (a dropped double tap). */
export function nextTrip(trip: Trip, event: TripEvent): Trip {
  if (trip.phase === 'idle') return fromIdle(event);
  if (event.type === 'abort') return IDLE;
  if (event.type === 'cleared') return trip.phase === 'leaving' || trip.phase === 'fading' ? IDLE : trip;
  if (trip.phase === 'fading') return trip;
  const step = FLIGHT_STEPS[trip.phase][event.type];
  if (step) return step(trip);
  if (event.type === 'destinationDrawn' && !trip.destinationDrawn) return { ...trip, destinationDrawn: true };
  return trip;
}

export function inAir(trip: Trip): boolean {
  return trip.phase !== 'idle';
}

const IN_THE_AIR: ReadonlySet<Trip['phase']> = new Set(['boarding', 'flying']);

/** The print a flyer stands in for is hidden until it lands, so the picture is never on screen twice. */
export function hidesFace(trip: Trip, { scope, id }: FaceKey): boolean {
  return 'flight' in trip && IN_THE_AIR.has(trip.phase) && trip.flight.id === id && trip.flight.scope === scope;
}
