import { SPACE } from '../../theme/tokens.ts';
import { POST_NOTE_TOP } from '../post/postLayout.ts';

/** The least room between the opening's last line and the pills. */
export const TEXT_PILLS_GAP = SPACE.screenTop;
const PILL_HEIGHT = SPACE.touch;

/** Where a text page's note begins, from the window's top: the post page's place, under the counter's row (#61). */
export function textBlockTop(topInset: number): number {
  return topInset + POST_NOTE_TOP;
}

/** Where a text page's words must stop: above the pills and the room kept for the system bar. */
export function textBlockBottom({ height, bottomInset }: { readonly height: number; readonly bottomInset: number }): number {
  return height - bottomInset - PILL_HEIGHT - TEXT_PILLS_GAP;
}

export interface TextFrame {
  readonly width: number;
  readonly textTop: number;
  readonly textBottom: number;
}

/** The text block on an imageless article's page: where its print's frame lands (#61). */
export function textPlace({ width, textTop, textBottom }: TextFrame) {
  return { x: SPACE.margin, y: textTop, width: width - SPACE.margin * 2, height: Math.max(0, textBottom - textTop) };
}

/** Whole lines of the opening that fit the room it was laid out with; never fewer than one. */
export function openingLines({ room, lineHeight }: { readonly room: number; readonly lineHeight: number }): number {
  return lineHeight > 0 ? Math.max(1, Math.floor(room / lineHeight)) : 1;
}
