export interface Ordered {
  /** When the room's newest live item was saved (ISO); null for an empty room. */
  readonly newestAt: string | null;
}

function newestFirst(a: Ordered, b: Ordered): number {
  if (a.newestAt === b.newestAt) return 0;
  if (a.newestAt === null) return 1;
  if (b.newestAt === null) return -1;
  return a.newestAt < b.newestAt ? 1 : -1;
}

/**
 * Pure: Home's rooms, the one that got the newest item first (#106). Given in the order they were made, so the
 * stable sort keeps that order for ties and sinks empty rooms to the end in it.
 */
export function roomOrder<Room extends Ordered>(rooms: readonly Room[]): readonly Room[] {
  return [...rooms].sort(newestFirst);
}
