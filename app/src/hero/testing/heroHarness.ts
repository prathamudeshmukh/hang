import type { Item } from '../../db/schema.ts';
import { toCardModel, type CardModel } from '../../grid/cardModel.ts';
import { anItem, CARD_NOW } from '../../grid/testing/anItem.ts';
import type { Rect, Size } from '../geometry.ts';
import { createHero, type HeroPorts, type Stage } from '../hero.ts';
import { createOrigins } from '../origins.ts';
import type { Flight } from '../trip.ts';

export const FEED: Size = { width: 400, height: 1000 };
export const CARD_RECT: Rect = { x: 20, y: 300, width: 180, height: 240 };
export const SCOPE = 'inbox';

/** Lets every pending promise callback run, so an async trip reaches its next wait. */
export const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

export function aCard(overrides: Partial<Item> = {}): CardModel {
  return toCardModel(anItem({ id: 'a', status: 'ready', kind: 'video', thumbW: 1600, thumbH: 900, ...overrides }), 'file:///a.jpg', CARD_NOW);
}

interface HarnessOptions {
  readonly reduceMotion?: boolean;
  /** Timeouts fire at once instead of never (boarding and settle waits). */
  readonly timeoutsFire?: boolean;
  readonly withStage?: boolean;
  readonly failFlight?: boolean;
  /** The feed's fade on the way back never finishes, until `finishFeedFade` is called. */
  readonly holdFeedFade?: boolean;
}

/** A hero with a recording stage and fake navigation, origins and clock. */
export function heroHarness({ reduceMotion = false, timeoutsFire = false, withStage = true, failFlight = false, holdFeedFade = false }: HarnessOptions = {}) {
  const calls: string[] = [];
  const flights: Flight[] = [];
  const pushes: { readonly ids: readonly string[]; readonly start: string }[] = [];
  const origins = createOrigins();
  let finishFeedFade = () => undefined as void;
  const feedFade = holdFeedFade ? new Promise<void>((resolve) => { finishFeedFade = resolve; }) : Promise.resolve();
  const stage: Stage = {
    board: (flight) => {
      calls.push(`board:${flight.direction}`);
      flights.push(flight);
    },
    fly: (flight) => {
      calls.push(`fly:${flight.look.kind}`);
      flights.push(flight);
      return failFlight ? Promise.reject(new Error('animation failed')) : Promise.resolve();
    },
    leave: (direction) => {
      calls.push(`leave:${direction}`);
      return Promise.resolve();
    },
    fadeFeedAway: () => {
      calls.push('feed:away');
      return feedFade;
    },
    setFeedOpacity: (opacity, durationMs) => {
      calls.push(`feed:${opacity}:${durationMs}`);
      return Promise.resolve();
    },
  };
  const warnings: string[] = [];
  const ports: HeroPorts = {
    origins,
    pushFeed: (ids, start) => {
      calls.push('push');
      pushes.push({ ids, start });
    },
    reduceMotion: () => reduceMotion,
    feedSize: () => FEED,
    delay: () => (timeoutsFire ? Promise.resolve() : new Promise(() => undefined)),
    nextFrame: () => Promise.resolve(),
    warn: (message) => warnings.push(message),
  };
  const hero = createHero(ports);
  if (withStage) hero.attachStage(stage);
  return { hero, origins, calls, flights, pushes, warnings, finishFeedFade: () => finishFeedFade() };
}
