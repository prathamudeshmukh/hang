import { useState } from 'react';
import type { CreateOutcome } from '@/collections/createCollection';
import type { CollectionChoice, ShareCapture } from './shareCapture';

/**
 * + New in the share sheet (#76): Enter makes the collection and selects it; Save is still the only thing that
 * files. `created` follows the collections the sheet opened with; `draftError` takes the footer hint's place.
 */
export function useNewCollections(capture: Pick<ShareCapture, 'createCollection'>, select: (id: string) => void) {
  const [created, setCreated] = useState<readonly CollectionChoice[]>([]);
  const [draftError, setDraftError] = useState<string | null>(null);

  const createCollection = (name: string): CreateOutcome => {
    const outcome = capture.createCollection(name);
    if (outcome.kind === 'created') {
      setCreated((earlier) => [...earlier, outcome.choice]);
      select(outcome.choice.id);
    }
    return outcome;
  };

  return { created, draftError, setDraftError, createCollection };
}
