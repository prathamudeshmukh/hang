/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { MOTION } from '../theme/tokens.ts';
import { DEFAULT_TUNING, flightPlan, type FlightTuning } from './flightPlan.ts';

const LIFT = [0.3, 0, 0.1, 1] as const;
const LET_GO = [0.4, 0, 0.2, 1] as const;
const TUNING: FlightTuning = { out: LIFT, back: LET_GO, durationMs: 400, textFadeMs: 100, ground: 'calm' };

describe('flightPlan', () => {
  it('flies each direction on its own curve, over the flight duration', () => {
    const [out, back] = [flightPlan(TUNING, 'out').flyer, flightPlan(TUNING, 'back').flyer];
    assert.deepEqual([out, back], [{ durationMs: 400, curve: LIFT }, { durationMs: 400, curve: LET_GO }]);
  });

  it('runs the ground under the flyer over the same duration on the calm curve, so both land together', () => {
    assert.deepEqual(flightPlan(TUNING, 'back').ground, { durationMs: 400, curve: MOTION.easing });
  });

  it('puts the ground on the flyer curve when linked', () => {
    assert.deepEqual(flightPlan({ ...TUNING, ground: 'linked' }, 'out').ground.curve, LIFT);
  });

  it('fades the feed text on the calm curve over its own, shorter time', () => {
    assert.deepEqual(flightPlan(TUNING, 'back').text, { durationMs: 100, curve: MOTION.easing });
  });

  it('takes its defaults from the flight token, not the global curve', () => {
    assert.deepEqual([DEFAULT_TUNING.out, DEFAULT_TUNING.durationMs], [MOTION.flight.out, MOTION.flight.durationMs]);
    assert.notDeepEqual(DEFAULT_TUNING.out, MOTION.easing);
  });
});
