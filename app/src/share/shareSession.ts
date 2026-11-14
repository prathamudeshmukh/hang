import { db, ensureMigrated } from '@/db/client';
import { createCollectionsRepository } from '@/db/collectionsRepository';
import { newId } from '@/db/deviceIds';
import { createItemsRepository } from '@/db/itemsRepository';
import { systemClock } from '@/db/types';
import { createThumbStore } from '@/thumbs/thumbStore';
import { createShareCapture, type ShareCapture } from './shareCapture';

const repositoryDeps = { db, clock: systemClock };
const items = createItemsRepository(repositoryDeps);
const collections = createCollectionsRepository(repositoryDeps);

/**
 * On a cold start through a share the main app never mounted, so the session may not be restored yet.
 * `start()` runs once per process; the `sync()` after it queues a follow-up if a sync is already running.
 * Loaded lazily: supabase-js and Google sign-in shouldn't delay the sheet, and a missing env var
 * mustn't stop it saving locally.
 */
async function pushOutbox(): Promise<void> {
  const { authSession } = await import('@/auth/appSession');
  await authSession.start();
  await authSession.sync();
}

/** One capture per sheet: it remembers the item that sheet saved. */
export function createAppShareCapture(): ShareCapture {
  return createShareCapture({
    ready: ensureMigrated,
    items,
    collections,
    newId,
    thumbs: createThumbStore(db),
    push: pushOutbox,
    logger: { warn: console.warn, error: console.error },
  });
}
