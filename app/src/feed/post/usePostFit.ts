import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import type { CardMedia } from '@/grid/cardModel';
import { POST_FIT, type PostFitStep } from '@/theme/typeScale';
import { fitStep, type MeasuredStep, type WordsFit } from './postFit';
import { contentRoom, pictureBox, pictureCap, wordsRoom, type Box } from './postLayout';

type Slots = readonly (MeasuredStep | null)[];
const UNMEASURED: Slots = POST_FIT.map(() => null);

/** The six hidden settings of the words, keyed so new words or a new width measure again (#59 decision 5). */
function useMeasuredSteps(key: string) {
  const [state, setState] = useState<{ readonly key: string; readonly slots: Slots }>({ key, slots: UNMEASURED });
  const slots = state.key === key ? state.slots : UNMEASURED;
  const onMeasured = useCallback(
    (at: number, step: MeasuredStep) =>
      setState((previous) => {
        const current = previous.key === key ? previous.slots : UNMEASURED;
        return { key, slots: current.map((slot, index) => (index === at ? step : slot)) };
      }),
    [key],
  );
  const measured = slots.every((slot) => slot !== null) ? (slots as readonly MeasuredStep[]) : null;
  return { measured, onMeasured };
}

function useLaidOutBox() {
  const [box, setBox] = useState<Box | null>(null);
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setBox((previous) => (previous?.width === width && previous.height === height ? previous : { width, height }));
  }, []);
  return [box, onLayout] as const;
}

export interface PostFitInput {
  readonly words: string | null;
  readonly picture: CardMedia | null;
  readonly pageHeight: number;
  readonly fontScale: number;
}

export interface PostFit {
  /** Null until measured; a picture-only post is ready as soon as the body is laid out. */
  readonly step: PostFitStep | null;
  readonly maxLines: number | null;
  readonly picture: Box | null;
  readonly ready: boolean;
  /** True while the hidden settings still have to be laid out. */
  readonly measuring: boolean;
}

const stepOfSize = (fit: WordsFit | null) => POST_FIT.find(({ size }) => size === fit?.size) ?? null;

/** Lays a post page out: which `post-fit` step the words take, and the picture's box (DESIGN.md §8). */
export function usePostFit({ words, picture, pageHeight, fontScale }: PostFitInput) {
  const [body, onBodyLayout] = useLaidOutBox();
  const [imprint, onImprintLayout] = useLaidOutBox();
  const { measured, onMeasured } = useMeasuredSteps(`${body?.width ?? 0}:${fontScale}:${words ?? ''}`);
  const fit = useMemo((): PostFit => {
    const content = body && imprint ? contentRoom({ body: body.height, imprint: imprint.height }) : null;
    const maxHeight = words ? pictureCap(pageHeight) : content;
    const box = body && picture && maxHeight !== null ? pictureBox({ width: body.width, ratio: picture.naturalRatio, maxHeight }) : null;
    const wordsFit = words && content !== null && measured ? fitStep(wordsRoom(content, box?.height ?? null), measured) : null;
    const ready = words ? wordsFit !== null : content !== null;
    return { step: stepOfSize(wordsFit), maxLines: wordsFit?.maxLines ?? null, picture: box, ready, measuring: Boolean(words && body && !measured) };
  }, [body, imprint, measured, picture, pageHeight, words]);
  return { fit, onBodyLayout, onImprintLayout, onMeasured };
}
