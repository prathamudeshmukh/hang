import type { RoomColours } from '../rooms/roomColours.ts';

/** How many pictures a room's tile on Home hangs: one large, two beside it (#106). */
export const MOSAIC_PICTURES = 3;

export type ShadeIndex = 0 | 1 | 2;

/** One cell of a room's tile: a picture, one of the room's three print shades, its newest title, or plain paper. */
export type MosaicCell =
  | { readonly kind: 'picture'; readonly uri: string }
  | { readonly kind: 'shade'; readonly at: ShadeIndex }
  | { readonly kind: 'words'; readonly text: string }
  | { readonly kind: 'blank' };

/** The large cell first, then the two small ones. */
export type RoomMosaic = readonly [MosaicCell, MosaicCell, MosaicCell];

export interface MosaicSource {
  readonly count: number;
  /** The newest downloaded thumbnails, newest first. */
  readonly pictures: readonly string[];
  readonly colours: RoomColours | null;
  /** What the newest item is called, for a room with nothing to picture. */
  readonly newestWords: string | null;
}

const BLANK: MosaicCell = { kind: 'blank' };
const CELLS: readonly ShadeIndex[] = [0, 1, 2];

/** Pure: a room shows what hangs in it, and never a colour its contents didn't give (#96). */
export function roomMosaic({ count, pictures, colours, newestWords }: MosaicSource): RoomMosaic {
  if (count === 0) return [BLANK, BLANK, BLANK];
  if (pictures.length === 0 && !colours) {
    return [newestWords ? { kind: 'words', text: newestWords } : BLANK, BLANK, BLANK];
  }
  const [big, first, second] = CELLS.map((at): MosaicCell => {
    const uri = pictures[at];
    if (uri) return { kind: 'picture', uri };
    return colours ? { kind: 'shade', at } : BLANK;
  });
  return [big, first, second];
}
