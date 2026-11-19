import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import { CollectionNameError } from '../db/validation.ts';

export interface CollectionChoice {
  readonly id: string;
  readonly name: string;
}

export type CreateOutcome =
  | { readonly kind: 'created'; readonly choice: CollectionChoice }
  | { readonly kind: 'invalid'; readonly message: string };

export interface CreateCollectionDeps {
  readonly collections: Pick<CollectionsRepository, 'create'>;
  /** Only for failures the user can't fix; the detail can be a raw SQLite message, so it's logged, not shown. */
  readonly warn: (message: string, detail: string) => void;
}

export const COULD_NOT_CREATE = 'Couldn’t make that collection. Try again.';

const detailOf = (error: unknown) => (error instanceof Error ? `${error.name}: ${error.message}` : String(error));

/** Creates a collection (local insert + outbox); a refused name comes back as its message instead of a throw. */
export function tryCreateCollection({ collections, warn }: CreateCollectionDeps, input: { readonly id: string; readonly name: string }): CreateOutcome {
  try {
    const { id, name } = collections.create(input);
    return { kind: 'created', choice: { id, name } };
  } catch (error) {
    if (error instanceof CollectionNameError) return { kind: 'invalid', message: error.message };
    warn('Could not create a collection', detailOf(error));
    return { kind: 'invalid', message: COULD_NOT_CREATE };
  }
}
