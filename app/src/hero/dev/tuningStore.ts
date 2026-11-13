import { DEFAULT_TUNING, type Curve, type FlightTuning } from '../flightPlan.ts';

/*
 * Branch-only (#33): lets the owner compare flight tunings on the phone. Deleted, with FlightTuner, once a
 * tuning is picked and written into MOTION.flight.
 */

export const CURVES: readonly { readonly name: string; readonly curve: Curve }[] = [
  { name: 'calm', curve: [0.2, 0.7, 0.1, 1] },
  { name: 'lift', curve: [0.3, 0, 0.1, 1] },
  { name: 'standard', curve: [0.2, 0, 0, 1] },
  { name: 'soft', curve: [0.4, 0, 0.2, 1] },
];
export const DURATIONS_MS = [340, 400] as const;
export const TEXT_FADES_MS = [100, 180] as const;

let tuning: FlightTuning = DEFAULT_TUNING;
let listeners: readonly (() => void)[] = [];

export const currentTuning = (): FlightTuning => tuning;

export function tune(change: Partial<FlightTuning>): void {
  tuning = { ...tuning, ...change };
  listeners.forEach((listener) => listener());
}

export function subscribeTuning(listener: () => void): () => void {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((other) => other !== listener);
  };
}
