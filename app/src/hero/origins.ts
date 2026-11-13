import type { Rect } from './geometry.ts';

/** Which wall a print is on: a grid's place key, or a Home section. The same item can be on two at once. */
export type Scope = string;

export interface FaceKey {
  readonly scope: Scope;
  readonly id: string;
}

export type MeasureFace = () => Promise<Rect | null>;

/** A wall that can bring one of its prints into view under the feed and say where it is (#32 decision 4). */
export interface Origin {
  reveal(id: string): Promise<Rect | null>;
}

interface Face {
  /** One per registration, so a recycled cell's late removal can't drop its successor. */
  readonly token: symbol;
  readonly measure: MeasureFace;
  readonly drawn: boolean;
}

const keyOf = ({ scope, id }: FaceKey) => `${scope}\n${id}`;

/**
 * Where every mounted print and every wall is, so the hero can fly to them without knowing about
 * FlashList or ScrollView. Cells register on mount and leave on unmount or recycle.
 */
export function createOrigins() {
  let faces: ReadonlyMap<string, Face> = new Map();
  let origins: ReadonlyMap<Scope, Origin> = new Map();
  let waiters: ReadonlyMap<string, readonly (() => void)[]> = new Map();

  const without = <K, V>(map: ReadonlyMap<K, V>, key: K) => new Map([...map].filter(([k]) => k !== key));

  function wake(key: string) {
    const waiting = waiters.get(key) ?? [];
    waiters = without(waiters, key);
    waiting.forEach((resolve) => resolve());
  }

  return {
    addFace(at: FaceKey, measure: MeasureFace): () => void {
      const key = keyOf(at);
      const token = Symbol(key);
      faces = new Map(faces).set(key, { token, measure, drawn: false });
      return () => {
        if (faces.get(key)?.token === token) faces = without(faces, key);
      };
    },
    markDrawn(at: FaceKey): void {
      const key = keyOf(at);
      const face = faces.get(key);
      if (face) faces = new Map(faces).set(key, { ...face, drawn: true });
      wake(key);
    },
    /** Resolves once the print has drawn its image (at once if it already has). */
    whenDrawn(at: FaceKey): Promise<void> {
      const key = keyOf(at);
      if (faces.get(key)?.drawn) return Promise.resolve();
      return new Promise((resolve) => {
        waiters = new Map(waiters).set(key, [...(waiters.get(key) ?? []), resolve]);
      });
    },
    measureFace(at: FaceKey): Promise<Rect | null> {
      return faces.get(keyOf(at))?.measure() ?? Promise.resolve(null);
    },
    addOrigin(scope: Scope, origin: Origin): () => void {
      origins = new Map(origins).set(scope, origin);
      return () => {
        if (origins.get(scope) === origin) origins = without(origins, scope);
      };
    },
    reveal(at: FaceKey): Promise<Rect | null> {
      return origins.get(at.scope)?.reveal(at.id) ?? Promise.resolve(null);
    },
  };
}

export type Origins = ReturnType<typeof createOrigins>;

/** Home's two kinds of print; walls use their place key. */
export const HOME_SCOPE = { strip: 'home:strip', rediscover: 'home:rediscover' } as const;
