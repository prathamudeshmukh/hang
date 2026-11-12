export interface ShownThumb {
  readonly id: string;
  readonly uri: string | null;
}

/**
 * Only a thumbnail that lands while its card is on screen fades in (#29). A card drawn with its file already
 * there, or a recycled cell switching to another card, shows the image at once.
 */
export function thumbJustArrived(previous: ShownThumb | null, next: ShownThumb): boolean {
  return previous !== null && previous.id === next.id && previous.uri === null && next.uri !== null;
}
