/** How the words came out at one `post-fit` step, from the hidden measuring pass (#59). */
export interface MeasuredStep {
  readonly size: number;
  readonly lines: number;
  /** All the lines together, as laid out: already at the system font scale. */
  readonly height: number;
}

/** The step the words are set at; `maxLines` is set only when even the smallest step overflows. */
export interface WordsFit {
  readonly size: number;
  readonly maxLines: number | null;
}

const fits = (room: number) => (step: MeasuredStep) => step.height <= room;

/** DESIGN.md §8: the largest step that fits; below the smallest, the whole lines that fit, then an ellipsis. */
export function fitStep(room: number, measured: readonly MeasuredStep[]): WordsFit | null {
  if (measured.length === 0) return null;
  const largestFirst = [...measured].sort((a, b) => b.size - a.size);
  const fitting = largestFirst.find(fits(room));
  if (fitting) return { size: fitting.size, maxLines: null };
  const smallest = largestFirst[largestFirst.length - 1];
  const lineHeight = smallest.height / smallest.lines;
  return { size: smallest.size, maxLines: Math.max(1, Math.floor(room / lineHeight)) };
}
