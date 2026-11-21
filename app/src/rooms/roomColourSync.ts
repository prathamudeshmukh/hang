import { roomColours, type RoomColours } from './roomColours.ts';
import type { RoomColourStore } from './roomColourStore.ts';
import { roomHue } from './roomHue.ts';

const same = (a: RoomColours | undefined, b: RoomColours) => a !== undefined && JSON.stringify(a) === JSON.stringify(b);

/** Runs after every sync (#85), beside thumbnails: works out each room's colour and stores it for the lists to read. */
export function createRoomColourSync(store: RoomColourStore) {
  return {
    run(): void {
      const ids = store.collectionIds();
      const votes = store.votes();
      const stored = store.all();
      const coloured = ids.flatMap((id) => {
        const before = stored.get(id);
        const after = roomColours(roomHue(votes.get(id) ?? [], before?.family ?? null));
        if (!after) return [];
        if (!same(before, after)) store.save(id, after);
        return [id];
      });
      // A room without colour (#96) keeps no row: an emptied room forgets the colour of things that have left, family
      // included, so it starts fresh (no hysteresis) when pictures come back.
      store.keepOnly(coloured);
    },
  };
}
