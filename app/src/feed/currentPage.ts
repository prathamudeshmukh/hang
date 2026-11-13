/**
 * The page to show after the list changed under the viewer: the same one if it's still there, else the
 * next survivor in the snapshot's order, else the one before (#31: deleted items drop out).
 */
export function shownId(sessionIds: readonly string[], pageIds: readonly string[], currentId: string): string | null {
  if (pageIds.includes(currentId)) return currentId;
  const surviving = new Set(pageIds);
  const at = sessionIds.indexOf(currentId);
  const after = sessionIds.slice(at + 1).find((id) => surviving.has(id));
  const before = sessionIds.slice(0, Math.max(at, 0)).findLast((id) => surviving.has(id));
  return after ?? before ?? null;
}
