import type { RoomColours } from '../rooms/roomColours.ts';
import type { CollectionRow } from './homeLists.ts';

/** What a collection's cover on Home shows (#96): never a colour its contents didn't give. */
export type CollectionCover =
  | { readonly kind: 'picture'; readonly uri: string }
  | { readonly kind: 'colour'; readonly colours: RoomColours }
  | { readonly kind: 'initial'; readonly letter: string }
  | { readonly kind: 'empty' };

/** By code point, so an emoji's two halves stay together (Hermes has no Intl.Segmenter). */
const initialOf = (name: string) => (Array.from(name.trim())[0] ?? '').toLocaleUpperCase();

/** Pure: the newest picture; the room's colour while that hasn't come; a room of words' initial; plain paper when empty. */
export function collectionCover({ name, count, coverUri, colours }: Pick<CollectionRow, 'name' | 'count' | 'coverUri' | 'colours'>): CollectionCover {
  if (count === 0) return { kind: 'empty' };
  if (coverUri) return { kind: 'picture', uri: coverUri };
  if (colours) return { kind: 'colour', colours };
  return { kind: 'initial', letter: initialOf(name) };
}
