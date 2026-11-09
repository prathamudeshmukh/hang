import { useCallback, useEffect, useRef, useState } from 'react';
import type { SpikeItem } from '../items';
import { type Backdrop, type Rect, useFlight } from './useFlight';

export type Stage = 'grid' | 'feed' | 'reader';

/**
 * boarding → flyer parked on the source, waiting for its image to be drawn
 * flying   → animating on the UI thread
 * settling → destination mounted under the flyer, waiting for its image to be drawn
 * idle     → nothing in the air
 */
export type Phase = 'idle' | 'boarding' | 'flying' | 'settling';

export interface Scene {
  readonly stage: Stage;
  readonly item?: SpikeItem;
  readonly phase: Phase;
}

export interface Trip {
  readonly item: SpikeItem;
  readonly route: { readonly from: Rect; readonly to: Rect };
  readonly stage: Stage;
  readonly backdrop: Backdrop;
}

/** If a destination image never reports "drawn" (e.g. load error), don't leave the flyer stuck. */
const SETTLE_TIMEOUT_MS = 300;

export function useHeroScene() {
  const [scene, setScene] = useState<Scene>({ stage: 'grid', phase: 'idle' });
  const { prepare, launch, flyerStyle, darkStyle, paperStyle } = useFlight();
  const drawnFlyerItem = useRef<string | undefined>(undefined);
  const boardingTrip = useRef<Trip | null>(null);

  const land = useCallback((stage: Stage) => {
    setScene((s) => ({ ...s, stage, phase: stage === 'grid' ? 'idle' : 'settling' }));
  }, []);

  const takeOff = useCallback(
    (trip: Trip) => {
      setScene({ stage: trip.stage, item: trip.item, phase: 'flying' });
      launch(trip.backdrop, () => land(trip.stage));
    },
    [launch, land],
  );

  const depart = useCallback(
    (trip: Trip) => {
      prepare(trip.route);
      if (drawnFlyerItem.current === trip.item.id) return takeOff(trip);
      boardingTrip.current = trip;
      setScene({ stage: trip.stage, item: trip.item, phase: 'boarding' });
    },
    [prepare, takeOff],
  );

  const onFlyerDrawn = useCallback(() => {
    drawnFlyerItem.current = scene.item?.id;
    const trip = boardingTrip.current;
    boardingTrip.current = null;
    if (trip) takeOff(trip);
  }, [scene.item, takeOff]);

  const onDestinationDrawn = useCallback(() => {
    setScene((s) => (s.phase === 'settling' ? { ...s, phase: 'idle' } : s));
  }, []);

  useEffect(() => {
    if (scene.phase !== 'settling') return undefined;
    const timer = setTimeout(onDestinationDrawn, SETTLE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [scene.phase, onDestinationDrawn]);

  return { scene, depart, onFlyerDrawn, onDestinationDrawn, flyerStyle, darkStyle, paperStyle };
}
