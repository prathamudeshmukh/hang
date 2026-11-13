import { createContext, useCallback, useContext, useEffect, useMemo, useRef, type ComponentRef, type RefObject } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';
import { heroOrigins } from './appHero';
import { nextFrame } from './frames';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { insetRect, type Axis, type Insets, type Rect } from './geometry';
import { measureView } from './HeroFace';
import type { Scope } from './origins';
import { revealInList, revealInScrollers, type ScrollerStep } from './reveal';

/** Keeps the latest value in a ref, so origins registered once still see the list as it is now. */
function useLatest<T>(value: T) {
  const latest = useRef(value);
  useEffect(() => {
    latest.current = value;
  });
  return latest;
}

const faceOf = (scope: Scope, id: string) => () => heroOrigins.measureFace({ scope, id });

/** A scroller's window rect, less the system bars it draws under (edge to edge). */
async function visibleArea(view: Parameters<typeof measureView>[0], insets: Insets): Promise<Rect | null> {
  const rect = await measureView(view);
  return rect ? insetRect(rect, insets) : null;
}

/** FlashList, as far as a reveal needs it. */
export interface JumpableList {
  scrollToIndex(params: { readonly index: number; readonly viewPosition: number; readonly animated: boolean }): void;
}

const MIDDLE = 0.5;

/** A virtualised wall (the grid): jumps to an item that isn't fully on screen. Put the returned ref on the list's frame. */
export function useListOrigin(scope: Scope, list: RefObject<JumpableList | null>, ids: readonly string[]) {
  const frame = useRef<ComponentRef<typeof View>>(null);
  const latestIds = useLatest(ids);
  const insets = useLatest(useSafeAreaInsets());
  useEffect(
    () =>
      heroOrigins.addOrigin(scope, {
        reveal: (id) =>
          revealInList({
            index: latestIds.current.indexOf(id),
            face: faceOf(scope, id),
            viewport: () => visibleArea(frame.current, insets.current),
            jumpTo: (index) => list.current?.scrollToIndex({ index, viewPosition: MIDDLE, animated: false }),
            nextFrame,
          }),
      }),
    [scope, list, latestIds, insets],
  );
  return frame;
}

type ScrollViewHandle = ComponentRef<typeof ScrollView>;

/** A plain ScrollView a print can sit in, tracked so it can be nudged without animation. Pass `attach` as its ref. */
export function useScroller(axis: Axis) {
  const ref = useRef<ScrollViewHandle | null>(null);
  const insets = useLatest(useSafeAreaInsets());
  const offset = useRef(0);
  const attach = useCallback((view: ScrollViewHandle | null) => {
    ref.current = view;
  }, []);
  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      offset.current = event.nativeEvent.contentOffset[axis];
    },
    [axis],
  );
  const step = useMemo<ScrollerStep>(
    () => ({
      axis,
      viewport: () => (axis === 'y' ? visibleArea(ref.current, insets.current) : measureView(ref.current)),
      scrollBy: (delta) => {
        offset.current = Math.max(0, offset.current + delta);
        ref.current?.scrollTo({ [axis]: offset.current, animated: false });
      },
    }),
    [axis, insets],
  );
  return { attach, onScroll, step };
}

/** Home's own scroll, so the strip and Rediscover can bring a print into view vertically too. */
export const PageScroller = createContext<ScrollerStep | null>(null);

/** Prints that are always mounted (the strip, Rediscover): scrolls each container in turn, innermost first. */
export function useScrollersOrigin(scope: Scope, ids: readonly string[], inner: ScrollerStep | null) {
  const page = useContext(PageScroller);
  const latest = useLatest({ ids, steps: [inner, page].filter((step): step is ScrollerStep => step !== null) });
  useEffect(
    () =>
      heroOrigins.addOrigin(scope, {
        reveal: (id) =>
          latest.current.ids.includes(id) ? revealInScrollers({ face: faceOf(scope, id), steps: latest.current.steps, nextFrame }) : Promise.resolve(null),
      }),
    [scope, latest],
  );
}
