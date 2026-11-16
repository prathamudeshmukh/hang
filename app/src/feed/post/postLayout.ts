import { SPACE } from '../../theme/tokens.ts';
import { POST_FIT, postFitStyle, textStyle } from '../../theme/typeScale.ts';

/** DESIGN.md §8 *Post pages*: the note sits under the counter's row, the words a rhythm under the note. */
export const POST_NOTE_TOP = SPACE.touch;
export const POST_WORDS_GAP = SPACE.rhythm;
/** The imprint signs right under the last line; the seam sits a margin from both sides. */
export const POST_IMPRINT_GAP = SPACE.margin;
export const POST_SEAM_GAP = SPACE.margin;
export const HAIRLINE = 1;
/** The least spare room above the pills. */
export const POST_PILLS_GAP = SPACE.screenTop;
/** A picture answering words is capped at 40% of the page. */
const PICTURE_SHARE = 0.4;

export interface Box {
  readonly width: number;
  readonly height: number;
}

/** Where the words begin, from the window's top; the page lays out to it and the hero lands on it (#59). */
export function postWordsTop({ topInset, fontScale }: { readonly topInset: number; readonly fontScale: number }): number {
  return topInset + POST_NOTE_TOP + textStyle('note').lineHeight * fontScale + POST_WORDS_GAP;
}

export interface PostFrame extends Box {
  readonly wordsTop: number;
}

/** The words' place for the flight: the measure at the words' top, at the print's own shape (#59 decision 4). */
export function wordsPlace(frame: PostFrame, printRatio: number) {
  const width = frame.width - SPACE.margin * 2;
  const shape = printRatio > 0 ? printRatio : 0;
  return { x: SPACE.margin, y: frame.wordsTop, width, height: Math.min(width * shape, frame.height - frame.wordsTop) };
}

export function pictureCap(pageHeight: number): number {
  return Math.round(pageHeight * PICTURE_SHARE);
}

/** A picture at its own shape across the measure; a tall one meets the cap and sits narrower. */
export function pictureBox({ width, ratio, maxHeight }: { readonly width: number; readonly ratio: number; readonly maxHeight: number }): Box | null {
  if (!(ratio > 0)) return null;
  const height = Math.min(maxHeight, width * ratio);
  return { width: height / ratio, height };
}

/** The room for the words and the picture: the body between note and pills, less its gaps and the imprint (if any). */
export function contentRoom({ body, imprint }: { readonly body: number; readonly imprint: number | null }): number {
  const signing = imprint === null ? 0 : POST_IMPRINT_GAP + imprint;
  return Math.max(0, body - POST_WORDS_GAP - signing - POST_PILLS_GAP);
}

const SEAM = POST_SEAM_GAP * 2 + HAIRLINE;
const SMALLEST_LINE = postFitStyle(POST_FIT[POST_FIT.length - 1]).lineHeight;

/** A picture answering words: 40% of the page, but never so tall that not one line of words is left above it. */
export function answerCap({ pageHeight, content, fontScale }: { readonly pageHeight: number; readonly content: number; readonly fontScale: number }): number {
  return Math.max(0, Math.min(pictureCap(pageHeight), content - SEAM - SMALLEST_LINE * fontScale));
}

/** What the words may fill: the content room, less the seam and the picture when one answers them. */
export function wordsRoom(content: number, pictureHeight: number | null): number {
  return pictureHeight === null ? content : Math.max(0, content - SEAM - pictureHeight);
}
