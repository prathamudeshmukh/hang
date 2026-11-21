import type { RoomColours, Swatch } from './roomColours.ts';
import { stableIndex } from './stableIndex.ts';

/** A print's colour in both schemes, drawn when it has no picture (#85). */
export interface PrintSwatch {
  readonly light: Swatch;
  readonly dark: Swatch;
}

const PRINT_COLOURS = 3;

/** A collection's stored colours; null when nothing it holds gives one, or before the sync step has run (#96). */
export const roomOf = (stored: ReadonlyMap<string, RoomColours>, collectionId: string): RoomColours | null =>
  stored.get(collectionId) ?? null;

/** One of the room's three print colours, the same for the item everywhere it's drawn. */
export function printSwatch(room: RoomColours, itemId: string): PrintSwatch {
  const at = stableIndex(itemId, PRINT_COLOURS);
  const pick = (prints: RoomColours['light']['prints']) => prints[at] ?? prints[0];
  return { light: pick(room.light.prints), dark: pick(room.dark.prints) };
}
