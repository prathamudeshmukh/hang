import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Alert } from 'react-native';
import { db } from '@/db/client';
import { createItemsRepository } from '@/db/itemsRepository';
import { systemClock } from '@/db/types';
import { appCollections } from '@/home/appListSources';
import { errorMessage } from '@/home/openItem';
import { createThumbStore } from '@/thumbs/thumbStore';
import type { FeedSources } from './feedList';
import { createFeedSessions } from './feedSession';
import { createMoveItem } from './moveItem';

let opened = 0;
const feedSessions = createFeedSessions(() => `${Date.now()}-${++opened}`);
const warn = (message: string) => console.warn(message);
const items = createItemsRepository({ db, clock: systemClock });

export const feedSources: FeedSources = { items, collections: appCollections, thumbs: createThumbStore(db) };

/** Pushes the feed route on the list as the opener shows it, starting at `start`. Openers go through the hero (#32). */
export function pushFeedRoute(ids: readonly string[], start: string): void {
  const session = feedSessions.begin({ ids, start });
  router.push({ pathname: '/feed', params: { session, start } });
}

export function readFeedSession(token: string, start: string) {
  return feedSessions.read(token, start);
}

export const moveItem = createMoveItem({
  file: items.file,
  tick: () => {
    Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick).catch((error: unknown) => warn(`Could not tick: ${errorMessage(error)}`));
  },
  warn,
  tellUser: () => Alert.alert('Couldn’t move this', 'It’s still where it was. Try again.'),
});
