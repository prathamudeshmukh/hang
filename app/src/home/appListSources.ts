import { db } from '@/db/client';
import { createCollectionsRepository } from '@/db/collectionsRepository';
import { createItemsRepository } from '@/db/itemsRepository';
import { systemClock } from '@/db/types';
import { createThumbStore } from '@/thumbs/thumbStore';
import type { ListSources } from './homeLists';

const repositoryDeps = { db, clock: systemClock };

export const appCollections = createCollectionsRepository(repositoryDeps);

/** The main app's lists read the same connection the share sheet and sync write to. */
export const appListSources: ListSources = {
  items: createItemsRepository(repositoryDeps),
  collections: appCollections,
  thumbs: createThumbStore(db),
};
