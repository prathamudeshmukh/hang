import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { Easing, useAnimatedStyle, useSharedValue, withDecay, withTiming, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MOTION } from '@/theme/tokens';
import { ZOOM, doubleTapScale, fittedSize, panLimit, REST, settledView, wantsOriginal, withGive, zoomAt, type Point, type Size, type View } from './zoom';

const [X1, Y1, X2, Y2] = MOTION.easing;
const SETTLE = { duration: MOTION.baseMs, easing: Easing.bezier(X1, Y1, X2, Y2) };
/** A pinch may overshoot the limits a little while the fingers are down; it settles back when they lift. */
const PINCH_SLACK = { under: 0.75, over: 1.25 } as const;
/** A finger that moves further than this is a drag, not a tap (gesture-handler's taps have no limit by default). */
const TAP_SLOP = 10;

export interface ZoomEvents {
  readonly onTap: () => void;
  readonly onZoomChange: (zoomed: boolean) => void;
  /** Once, the first time the image is zoomed past the thumbnail's sharpness. */
  readonly onWantsOriginal: () => void;
}

interface ZoomValues {
  readonly scale: SharedValue<number>;
  readonly x: SharedValue<number>;
  readonly y: SharedValue<number>;
}

function useZoomValues() {
  const values: ZoomValues = { scale: useSharedValue(1), x: useSharedValue(0), y: useSharedValue(0) };
  const start = useSharedValue<View>(REST);
  const focalStart = useSharedValue<Point>({ x: 0, y: 0 });
  const pinching = useSharedValue(false);
  const askedOriginal = useSharedValue(false);
  return { values, start, focalStart, pinching, askedOriginal };
}

/** Tells the page when the image goes from rest to zoomed and back, from either thread. */
function useZoomReport(events: ZoomEvents) {
  const [zoomed, setZoomed] = useState(false);
  const shown = useRef(false);
  const latest = useRef(events);
  useEffect(() => {
    latest.current = events;
  });
  const report = useCallback((next: boolean) => {
    if (shown.current === next) return;
    shown.current = next;
    setZoomed(next);
    latest.current.onZoomChange(next);
  }, []);
  const tap = useCallback(() => latest.current.onTap(), []);
  const wantOriginal = useCallback(() => latest.current.onWantsOriginal(), []);
  return { zoomed, report, tap, wantOriginal };
}

function readView({ scale, x, y }: ZoomValues): View {
  'worklet';
  return { scale: scale.get(), x: x.get(), y: y.get() };
}

function setView({ scale, x, y }: ZoomValues, view: View, animated: boolean): void {
  'worklet';
  scale.set(animated ? withTiming(view.scale, SETTLE) : view.scale);
  x.set(animated ? withTiming(view.x, SETTLE) : view.x);
  y.set(animated ? withTiming(view.y, SETTLE) : view.y);
}

/** A flick keeps the image gliding, but never past its edges; a pan let go past one eases back to it. */
function glideAxis(value: SharedValue<number>, velocity: number, limit: number): void {
  'worklet';
  const at = value.get();
  if (Math.abs(at) > limit) value.set(withTiming(Math.sign(at) * limit, SETTLE));
  else value.set(withDecay({ velocity, clamp: [-limit, limit] }));
}

/**
 * Pinch and double-tap zoom, a pan while zoomed, and a single tap (#60). The gestures are measured on a
 * detector the size of the page; the image is drawn fitted to it and transformed about its centre.
 */
export function useZoom(page: Size, ratio: number, events: ZoomEvents) {
  const { values, start, focalStart, pinching, askedOriginal } = useZoomValues();
  const { zoomed, report, tap, wantOriginal } = useZoomReport(events);

  const gesture = useMemo(() => {
    const centre = { x: page.width / 2, y: page.height / 2 };
    const fitted = fittedSize(page, ratio);
    const fromCentre = (x: number, y: number): Point => {
      'worklet';
      return { x: x - centre.x, y: y - centre.y };
    };
    const askOriginal = (scale: number) => {
      'worklet';
      if (askedOriginal.get() || !wantsOriginal(scale)) return;
      askedOriginal.set(true);
      scheduleOnRN(wantOriginal);
    };
    const settle = () => {
      'worklet';
      const view = settledView(readView(values), page, ratio);
      setView(values, view, true);
      scheduleOnRN(report, view.scale > 1);
    };

    const pinch = Gesture.Pinch()
      .onStart((event) => {
        pinching.set(true);
        start.set(readView(values));
        focalStart.set(fromCentre(event.focalX, event.focalY));
        scheduleOnRN(report, true);
      })
      .onUpdate((event) => {
        const from = start.get();
        const focal = fromCentre(event.focalX, event.focalY);
        const scale = Math.min(from.scale * event.scale, PINCH_SLACK.over * ZOOM.max);
        const view = zoomAt(from, focalStart.get(), Math.max(PINCH_SLACK.under, scale));
        const moved = { x: focal.x - focalStart.get().x, y: focal.y - focalStart.get().y };
        setView(values, { scale: view.scale, x: view.x + moved.x, y: view.y + moved.y }, false);
        askOriginal(view.scale);
      })
      .onEnd(() => {
        pinching.set(false);
        settle();
      });

    const pan = Gesture.Pan()
      .enabled(zoomed)
      .maxPointers(1)
      .onStart(() => start.set(readView(values)))
      .onUpdate((event) => {
        if (pinching.get()) return;
        const from = start.get();
        const limit = panLimit(page, fitted, from.scale);
        values.x.set(withGive(from.x + event.translationX, limit.x));
        values.y.set(withGive(from.y + event.translationY, limit.y));
      })
      .onEnd((event) => {
        if (pinching.get()) return;
        const limit = panLimit(page, fitted, values.scale.get());
        glideAxis(values.x, event.velocityX, limit.x);
        glideAxis(values.y, event.velocityY, limit.y);
      });

    const doubleTap = Gesture.Tap()
      .numberOfTaps(2)
      .maxDistance(TAP_SLOP)
      .onEnd((event) => {
        if (values.scale.get() > 1) {
          setView(values, REST, true);
          scheduleOnRN(report, false);
          return;
        }
        const target = zoomAt(REST, fromCentre(event.x, event.y), doubleTapScale(page, ratio));
        setView(values, settledView(target, page, ratio), true);
        scheduleOnRN(report, true);
        askOriginal(target.scale);
      });

    const singleTap = Gesture.Tap()
      .maxDistance(TAP_SLOP)
      .onEnd(() => scheduleOnRN(tap));

    return Gesture.Simultaneous(pinch, pan, Gesture.Exclusive(doubleTap, singleTap));
  }, [page, ratio, zoomed, values, start, focalStart, pinching, askedOriginal, report, tap, wantOriginal]);

  const imageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: values.x.value }, { translateY: values.y.value }, { scale: values.scale.value }],
  }));

  const zoomOut = useCallback(() => {
    setView(values, REST, true);
    report(false);
  }, [values, report]);

  return { gesture, imageStyle, zoomOut, zoomed };
}
