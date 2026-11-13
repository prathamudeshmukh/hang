import { useMemo } from 'react';
import { Easing, useSharedValue, withDelay, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MOTION, SCREENING_ROOM } from '@/theme/tokens';
import { flightPlan, type FlightTuning, type Timing } from './flightPlan';
import type { Rect } from './geometry';
import type { Stage } from './hero';
import { feedOpacity, feedTextOpacity } from './heroValues';
import type { Direction, Flight } from './trip';

const ZERO_RECT: Rect = { x: 0, y: 0, width: 0, height: 0 };
/** DESIGN.md §7: the text (here, the feed showing through) comes in 60ms behind the image. */
const TEXT_DELAY_MS = 60;
const timingOf = ({ durationMs, curve: [x1, y1, x2, y2] }: Timing) => ({ duration: durationMs, easing: Easing.bezier(x1, y1, x2, y2) });
const BASE = timingOf({ durationMs: MOTION.baseMs, curve: MOTION.easing });
const QUICK = timingOf({ durationMs: MOTION.quickMs, curve: MOTION.easing });

export interface StageValues {
  readonly from: SharedValue<Rect>;
  readonly to: SharedValue<Rect>;
  readonly progress: SharedValue<number>;
  /** 1 = the screening room's color over everything. */
  readonly backdrop: SharedValue<number>;
  readonly flyerOpacity: SharedValue<number>;
  /** A frame flyer's color at `from` and at `to`: the wall's `raised` and the room's. */
  readonly colors: SharedValue<readonly [string, string]>;
}

type Resolve = () => void;

/**
 * Starts an animation whose end callback resolves the promise. The callback runs on the UI thread, so it
 * may only hand `resolve` back to JS with scheduleOnRN, never call a JS function itself.
 */
function animated(start: (resolve: Resolve) => void): Promise<void> {
  return new Promise((resolve) => start(resolve));
}

interface StageInputs {
  readonly wallRaised: () => string;
  /** Read at each flight, so a change applies to the next one. */
  readonly tuning: () => FlightTuning;
}

function createStage(values: StageValues, { wallRaised, tuning }: StageInputs): Stage {
  const { from, to, progress, backdrop, flyerOpacity, colors } = values;
  const roomRaised = SCREENING_ROOM.raised;
  return {
    board(flight: Flight) {
      from.set(flight.from);
      to.set(flight.to);
      progress.set(0);
      flyerOpacity.set(1);
      // Going back, the feed itself is the ground: it fades off the wall under the flyer (fadeFeedAway).
      backdrop.set(0);
      colors.set(flight.direction === 'out' ? [wallRaised(), roomRaised] : [roomRaised, wallRaised()]);
    },
    fly(flight: Flight) {
      const plan = flightPlan(tuning(), flight.direction);
      if (flight.direction === 'out') backdrop.set(withTiming(1, timingOf(plan.ground)));
      return animated((resolve) => progress.set(withTiming(1, timingOf(plan.flyer), () => scheduleOnRN(resolve))));
    },
    fadeFeedAway() {
      const plan = flightPlan(tuning(), 'back');
      const text = animated((resolve) => feedTextOpacity.set(withTiming(0, timingOf(plan.text), () => scheduleOnRN(resolve))));
      const feed = animated((resolve) => feedOpacity.set(withTiming(0, timingOf(plan.ground), () => scheduleOnRN(resolve))));
      return Promise.all([text, feed]).then(() => undefined);
    },
    leave(direction: Direction) {
      if (direction === 'out') backdrop.set(withDelay(TEXT_DELAY_MS, withTiming(0, QUICK)));
      return animated((resolve) => flyerOpacity.set(withDelay(TEXT_DELAY_MS, withTiming(0, QUICK, () => scheduleOnRN(resolve)))));
    },
    setFeedOpacity(opacity: 0 | 1, durationMs: number) {
      if (opacity === 1) feedTextOpacity.set(1);
      if (durationMs <= 0) {
        feedOpacity.set(opacity);
        return Promise.resolve();
      }
      return animated((resolve) => feedOpacity.set(withTiming(opacity, { ...BASE, duration: durationMs }, () => scheduleOnRN(resolve))));
    },
  };
}

/** The shared values the layer draws from, and the Stage the hero drives them through. */
export function useStage(inputs: StageInputs) {
  const values: StageValues = {
    from: useSharedValue(ZERO_RECT),
    to: useSharedValue(ZERO_RECT),
    progress: useSharedValue(0),
    backdrop: useSharedValue(0),
    flyerOpacity: useSharedValue(1),
    colors: useSharedValue<readonly [string, string]>(['#000000', '#000000']),
  };
  // Shared values keep their identity across renders, so the stage is built once.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const stage = useMemo(() => createStage(values, inputs), []);
  return { values, stage };
}
