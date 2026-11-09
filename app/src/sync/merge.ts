type LocalValues = Readonly<Record<string, unknown>>;

export type MergeDecision =
  | { readonly kind: 'purge' }
  /** `insert` if the row is new here; `update` if it already exists. */
  | { readonly kind: 'upsert'; readonly insert: LocalValues; readonly update: LocalValues };

/**
 * How a row pulled from the server lands locally (SPEC §4 Sync).
 * - A tombstone (`deletedAt` set) removes the local row: deletes are final.
 * - Fields with un-pushed local writes keep their local value. The server never writes the user's own
 *   fields (collection, read state, progress), so this is what makes "user fields win": a pull can't
 *   undo a change that hasn't reached the server yet. Everything else is last write wins, and the server
 *   wrote last.
 */
export function mergePulledRow(pulled: LocalValues, pendingFields: ReadonlySet<string>): MergeDecision {
  if (pulled.deletedAt != null) return { kind: 'purge' };
  const update = Object.fromEntries(Object.entries(pulled).filter(([field]) => !pendingFields.has(field)));
  return { kind: 'upsert', insert: pulled, update };
}
