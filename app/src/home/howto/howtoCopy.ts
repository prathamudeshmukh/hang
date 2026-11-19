/** The empty Home's words (#75); DESIGN.md §9 keeps the same lines in its voice table. */
export const HOWTO_HEADING = 'Things get here from other apps.';
export const WAITING_LINE = 'Bringing your wall over…';

export interface HowToStepCopy {
  /** The step, in the name voice. */
  readonly name: string;
  /** A line of help beside it, in the note voice. */
  readonly note: string;
}

export const HOWTO_STEPS: readonly HowToStepCopy[] = [
  { name: 'Open anything', note: 'A page, a video, a post: whatever you’re looking at.' },
  { name: 'Tap Share', note: 'Usually in the top bar, or under ⋮.' },
  { name: 'Pick Hang', note: 'It may be under More.' },
];

/** What a screen reader says for one step: the drawing is decorative, so the row carries it all. */
export function stepLabel(index: number): string {
  const step = HOWTO_STEPS[index];
  if (!step) throw new Error(`There is no step ${index + 1} in the how-to`);
  return `Step ${index + 1} of ${HOWTO_STEPS.length}, ${step.name}. ${step.note}`;
}
