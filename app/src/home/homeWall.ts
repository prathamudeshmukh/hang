/**
 * What the feature wall shows (#75): the prints (`hanging`), a how-to for sharing (`empty`), or dashed frames
 * while the first pull brings an account's wall onto a new device (`waiting`).
 */
export type WallState = 'hanging' | 'waiting' | 'empty';

export interface WallFacts {
  /** Any live item on the device, the Inbox included. */
  readonly hasItems: boolean;
  /** A pull has finished at least once for this account on this device. */
  readonly hasPulled: boolean;
  /** This session's last sync failed: waiting would never end, so teach instead. */
  readonly syncFailed: boolean;
}

/** Items always win: shares made before sign-in hang at once, and nothing real is hidden behind a wait. */
export function wallState({ hasItems, hasPulled, syncFailed }: WallFacts): WallState {
  if (hasItems) return 'hanging';
  if (hasPulled || syncFailed) return 'empty';
  return 'waiting';
}
