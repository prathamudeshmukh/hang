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

/** A card as the lists draw it: an item hung in a coloured room takes one of its print colours; a post (ruled, unboxed) never does. */
export function listCard(item: Item, { thumbs, rooms, now }: CardContext): CardModel {
  const card = toCardModel(item, thumbs.get(item.id) ?? null, now);
  const room = item.collectionId === null ? null : roomOf(rooms, item.collectionId);
  if (!room || card.variant === 'post') return card;
  return { ...card, swatch: printSwatch(room, item.id) };
}
