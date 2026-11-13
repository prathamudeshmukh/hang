/** DESIGN.md §8: media fills the top ~56% of the page. */
export const MEDIA_SHARE = 0.56;

/** The media box's height on a page of this height; the hero lands on it too (#32). */
export function mediaHeight(pageHeight: number): number {
  return Math.round(pageHeight * MEDIA_SHARE);
}
