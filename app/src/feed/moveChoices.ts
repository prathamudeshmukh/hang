import { INBOX_TITLE } from '../home/homeLists.ts';

export interface MoveChoice {
  /** Null is the Inbox. */
  readonly id: string | null;
  readonly name: string;
}

interface NamedCollection {
  readonly id: string;
  readonly name: string;
}

const INBOX: MoveChoice = { id: null, name: INBOX_TITLE };

/** Where it can hang (#31): every collection in Home order, then the Inbox to un-file it. */
export function moveChoices(collections: readonly NamedCollection[]): readonly MoveChoice[] {
  return [...collections.map(({ id, name }) => ({ id, name })), INBOX];
}

/** Null when the collection isn't on the device any more. */
export function placeName(collections: readonly NamedCollection[], id: string | null): string | null {
  if (id === null) return INBOX_TITLE;
  return collections.find((collection) => collection.id === id)?.name ?? null;
}
