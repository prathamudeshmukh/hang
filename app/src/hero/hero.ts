import type { CardModel } from '../grid/cardModel.ts';
import { MOTION } from '../theme/tokens.ts';
import { landingRect, type Rect, type Size } from './geometry.ts';
import { landingOf, lookOf } from './look.ts';
import type { FaceKey, Origins, Scope } from './origins.ts';
import { IDLE, inAir, nextTrip, type Direction, type Flight, type Trip, type TripEvent } from './trip.ts';

/** DESIGN.md §7: every transition becomes a 120ms cross-fade under reduce motion. */
export const REDUCED_FADE_MS = 120;
/** A flyer whose image hasn't drawn by now flies as an empty frame (#32 decision 6). */
export const BOARDING_TIMEOUT_MS = 100;
/** Spike 0b: never leave a flyer stuck over a destination that doesn't report drawn. */
export const SETTLE_TIMEOUT_MS = 300;
const INSTANT = 0;

/** The animated layer over every screen (`HeroLayer`): the only part that touches Reanimated. */
export interface Stage {
  /** Parks the flyer on `from`, with the backdrop at its starting opacity. */
  board(flight: Flight): void;
  /** Resolves when the flyer has landed on `to`. */
  fly(flight: Flight): Promise<void>;
  /** Fades the flyer (and, going out, the backdrop) off the destination. */
  leave(direction: Direction): Promise<void>;
  /** Going back: the feed fades off the wall over the flight, its text sooner (#33). */
  fadeFeedAway(): Promise<void>;
  setFeedOpacity(opacity: 0 | 1, durationMs: number): Promise<void>;
}

export interface HeroPorts {
  readonly origins: Origins;
  readonly pushFeed: (ids: readonly string[], start: string) => void;
  readonly reduceMotion: () => boolean;
  /** The feed's size as last laid out (the window until then). */
  readonly feedSize: () => Size;
  readonly delay: (ms: number) => Promise<void>;
  readonly nextFrame: () => Promise<void>;
  readonly warn: (message: string) => void;
}

export interface OpenRequest {
  /** The list as the opener shows it (#31). */
  readonly ids: readonly string[];
  readonly card: CardModel;
  readonly scope: Scope;
}

export interface BackRequest {
  /** The page on screen; null when nothing is left in the feed. */
  readonly card: CardModel | null;
  readonly feed: Size;
  /** Removes the feed screen without any native animation. */
  readonly pop: () => void;
}

function createLatch() {
  let open = () => undefined as void;
  const opened = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { open, opened };
}

/** Resolves true if `event` comes first, false if the timeout does. */
const beats = (event: Promise<void>, timeout: Promise<void>) => Promise.race([event.then(() => true), timeout.then(() => false)]);

/**
 * Runs every hero trip (#32): grid, strip and Rediscover out to the feed, and back to the item's current
 * place. Plain TS with injected ports; `appHero.ts` wires the real ones.
 */
export function createHero(ports: HeroPorts) {
  let trip: Trip = IDLE;
  let busy = false;
  let stage: Stage | null = null;
  let openedFrom: Scope | null = null;
  let listeners: readonly (() => void)[] = [];
  let flyerDrawnLatch = createLatch();
  let feedDrawnLatch = createLatch();

  function dispatch(event: TripEvent) {
    const next = nextTrip(trip, event);
    if (next === trip) return;
    trip = next;
    listeners.forEach((listener) => listener());
  }

  const currentFlight = (): Flight | null => ('flight' in trip ? trip.flight : null);

  async function board(on: Stage, flight: Flight) {
    flyerDrawnLatch = createLatch();
    dispatch({ type: 'board', flight });
    on.board(flight);
  }

  async function waitForFlyer() {
    const drawn = await beats(flyerDrawnLatch.opened, ports.delay(BOARDING_TIMEOUT_MS));
    dispatch({ type: drawn ? 'flyerDrawn' : 'boardingTimedOut' });
  }

  async function flyAndLand(on: Stage) {
    const flight = currentFlight();
    if (flight) await on.fly(flight);
    dispatch({ type: 'landed' });
  }

  async function settle(on: Stage, direction: Direction, destination: Promise<void>) {
    if (trip.phase === 'settling') {
      const drawn = await beats(destination, ports.delay(SETTLE_TIMEOUT_MS));
      dispatch({ type: drawn ? 'destinationDrawn' : 'settleTimedOut' });
    }
    await on.leave(direction);
    dispatch({ type: 'cleared' });
  }

  async function fade(on: Stage, { direction, durationMs }: { readonly direction: Direction; readonly durationMs: number }) {
    dispatch({ type: 'fade', direction, durationMs });
    await on.setFeedOpacity(direction === 'out' ? 1 : 0, durationMs);
    dispatch({ type: 'cleared' });
  }

  async function flyOut(on: Stage, request: OpenRequest, from: Rect) {
    const look = lookOf(request.card);
    feedDrawnLatch = createLatch();
    await on.setFeedOpacity(0, INSTANT);
    await board(on, { id: request.card.id, scope: request.scope, direction: 'out', look, from, to: landingRect(ports.feedSize(), landingOf(look)) });
    // Mounting the feed keeps JS busy for a while: only once the flyer is drawn, while it flies on the UI thread.
    await waitForFlyer();
    ports.pushFeed(request.ids, request.card.id);
    await flyAndLand(on);
    await on.setFeedOpacity(1, INSTANT);
    await settle(on, 'out', feedDrawnLatch.opened);
  }

  async function goOut(on: Stage, request: OpenRequest) {
    const from = ports.reduceMotion() ? null : await ports.origins.measureFace({ scope: request.scope, id: request.card.id });
    if (from) return flyOut(on, request, from);
    await on.setFeedOpacity(0, INSTANT);
    ports.pushFeed(request.ids, request.card.id);
    await fade(on, { direction: 'out', durationMs: ports.reduceMotion() ? REDUCED_FADE_MS : MOTION.baseMs });
  }

  async function flyBack(on: Stage, { card, feed, pop }: BackRequest & { readonly card: CardModel }, at: FaceKey, to: Rect) {
    const look = lookOf(card);
    await board(on, { id: card.id, scope: at.scope, direction: 'back', look, from: landingRect(feed, landingOf(look)), to });
    await waitForFlyer();
    const fadedAway = on.fadeFeedAway();
    await flyAndLand(on);
    // The native removal lags the pop by a frame or two: only once the feed is invisible can it go unseen.
    await fadedAway;
    pop();
    await settle(on, 'back', ports.origins.whenDrawn(at));
  }

  async function goBack(on: Stage, request: BackRequest) {
    const at = request.card && openedFrom ? { scope: openedFrom, id: request.card.id } : null;
    const to = at ? await ports.origins.reveal(at) : null;
    if (at && to && request.card && !ports.reduceMotion()) return flyBack(on, { ...request, card: request.card }, at, to);
    await fade(on, { direction: 'back', durationMs: ports.reduceMotion() ? REDUCED_FADE_MS : MOTION.baseMs });
    request.pop();
  }

  /** Never leaves input blocked: a failed trip shows the feed (if it's open) and comes down. */
  async function runTrip(work: (on: Stage) => Promise<void>) {
    if (busy || inAir(trip) || !stage) return false;
    const on = stage;
    busy = true;
    try {
      await work(on);
    } catch (error) {
      ports.warn(`Hero trip failed: ${error instanceof Error ? error.message : String(error)}`);
      await on.setFeedOpacity(1, INSTANT);
      dispatch({ type: 'abort' });
    } finally {
      busy = false;
    }
    return true;
  }

  return {
    trip: () => trip,
    subscribe(listener: () => void): () => void {
      listeners = [...listeners, listener];
      return () => {
        listeners = listeners.filter((other) => other !== listener);
      };
    },
    attachStage(next: Stage): () => void {
      stage = next;
      return () => {
        if (stage === next) stage = null;
      };
    },
    open(request: OpenRequest): void {
      if (busy || inAir(trip)) return;
      openedFrom = request.scope;
      if (!stage) return ports.pushFeed(request.ids, request.card.id);
      void runTrip((on) => goOut(on, request));
    },
    back(request: BackRequest): void {
      if (busy || inAir(trip)) return;
      if (!stage) return request.pop();
      void runTrip((on) => goBack(on, request));
    },
    flyerDrawn: () => flyerDrawnLatch.open(),
    /** The feed page for `id` has drawn its media (image displayed, or laid out for a text face). */
    feedDrawn(id: string): void {
      if (currentFlight()?.id !== id) return;
      dispatch({ type: 'destinationDrawn' });
      feedDrawnLatch.open();
    },
  };
}

export type Hero = ReturnType<typeof createHero>;
