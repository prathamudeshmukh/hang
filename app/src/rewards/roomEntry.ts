/** How the title underline greets an arrival (DESIGN.md §7 "Entering a room"). */
export type RoomEntry = 'draw' | 'drawn' | 'none';

export interface Arrival {
  readonly place: 'collection' | 'inbox';
  readonly reduceMotion: boolean;
}

/** Collections are rooms; the Inbox is a pile to empty, so it gets no underline (#34). */
export function roomEntry({ place, reduceMotion }: Arrival): RoomEntry {
  if (place === 'inbox') return 'none';
  return reduceMotion ? 'drawn' : 'draw';
}
