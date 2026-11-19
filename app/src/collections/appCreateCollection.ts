import { newId } from '@/db/deviceIds';
import { appCollections } from '@/home/appListSources';
import { type CreateOutcome, tryCreateCollection } from './createCollection';

const deps = { collections: appCollections, warn: console.warn };

/** The main app's + New and New collection: a fresh device id, the shared connection. */
export function createAppCollection(name: string): CreateOutcome {
  return tryCreateCollection(deps, { id: newId(), name });
}
