import { addDatabaseChangeListener } from 'expo-sqlite';
import { useEffect, useState } from 'react';
import { db } from '@/db/client';
import { createCollectionsRepository } from '@/db/collectionsRepository';
import { createItemsRepository } from '@/db/itemsRepository';
import { createOutboxRepository } from '@/db/outboxRepository';
import { systemClock } from '@/db/types';
import { listRecentItems, type RecentItemRow } from './recentItems';

const repositoryDeps = { db, clock: systemClock };
const sources = {
  items: createItemsRepository(repositoryDeps),
  collections: createCollectionsRepository(repositoryDeps),
  outbox: createOutboxRepository(repositoryDeps),
};

/** Re-reads on every local write, including the share sheet's and the sync engine's (same connection). */
export function useRecentItems(): readonly RecentItemRow[] {
  const [rows, setRows] = useState<readonly RecentItemRow[]>(() => listRecentItems(sources));
  useEffect(() => {
    const subscription = addDatabaseChangeListener(() => setRows(listRecentItems(sources)));
    return () => subscription.remove();
  }, []);
  return rows;
}
