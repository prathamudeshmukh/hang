/** How the words came out at one `post-fit` step, from the hidden measuring pass (#59). */
export interface MeasuredStep {
  readonly size: number;
  readonly lines: number;
  /** All the lines together, as laid out: already at the system font scale. */
  readonly height: number;
  /** Which lines (from 0) are empty: the breaks between paragraphs. */
  readonly blank: readonly number[];
}

/** The step the words are set at; `maxLines` is set only when even the smallest step overflows. */
export interface WordsFit {
  readonly size: number;
  readonly maxLines: number | null;
}

const fits = (room: number) => (step: MeasuredStep) => step.height <= room;

/** DESIGN.md §8: the largest step that fits; below the smallest, the whole lines that fit, then an ellipsis. */
export function fitStep(room: number, measured: readonly MeasuredStep[]): WordsFit | null {
  // No lines means nothing was set (whitespace only): there is nothing to fit.
  if (measured.length === 0 || measured.some(({ lines }) => lines === 0)) return null;
  const largestFirst = [...measured].sort((a, b) => b.size - a.size);
  const fitting = largestFirst.find(fits(room));
  if (fitting) return { size: fitting.size, maxLines: null };
  const smallest = largestFirst[largestFirst.length - 1];
  const lineHeight = smallest.height / smallest.lines;
  return { size: smallest.size, maxLines: endOnWords(Math.max(1, Math.floor(room / lineHeight)), smallest.blank) };
}

/** Steps back past paragraph breaks, so the ellipsis lands on a line with words. */
function endOnWords(lines: number, blank: readonly number[]): number {
  return lines > 1 && blank.includes(lines - 1) ? endOnWords(lines - 1, blank) : lines;
}

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;
const LETTER = /\p{L}/u;

/** Newsreader has no CJK: words that are mostly Han, kana or Hangul are set upright, with more leading (#59). */
export function isMostlyCjk(text: string): boolean {
  const letters = [...text].filter((char) => LETTER.test(char));
  return letters.filter((char) => CJK.test(char)).length * 2 > letters.length;
}
