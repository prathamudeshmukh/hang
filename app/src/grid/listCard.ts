import type { Item } from '../db/schema.ts';
import type { RoomColours } from '../rooms/roomColours.ts';
import { printSwatch, roomOf } from '../rooms/roomOf.ts';
import { toCardModel, type CardModel } from './cardModel.ts';

/** What every card on a list is read with: downloaded thumbnails, room colours (#85) and the time. */
export interface CardContext {
  readonly thumbs: ReadonlyMap<string, string>;
  readonly rooms: ReadonlyMap<string, RoomColours>;
  readonly now: Date;
}

/** A card as the lists draw it: an item hung in a room takes one of the room's print colours; a post (ruled, unboxed) never does. */
export function listCard(item: Item, { thumbs, rooms, now }: CardContext): CardModel {
  const card = toCardModel(item, thumbs.get(item.id) ?? null, now);
  if (item.collectionId === null || card.variant === 'post') return card;
  return { ...card, swatch: printSwatch(roomOf(rooms, item.collectionId), item.id) };
}
