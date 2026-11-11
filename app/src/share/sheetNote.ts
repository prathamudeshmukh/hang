import type { ShareOpening } from './shareCapture.ts';

const NOT_SAVED_NOTES = {
  image: 'images can’t hang here yet',
  unsupported: 'nothing to hang here',
} as const;

/** The italic line under the preview title. `null` = the save hasn't finished yet. */
export function sheetNote(opening: ShareOpening | null, host: string): string {
  if (opening?.kind === 'notSaved') return NOT_SAVED_NOTES[opening.reason];
  if (opening?.kind === 'failed') return 'Couldn’t save this link';
  return `${host} · reading it now…`;
}

/** Swiping down keeps a saved share in the Inbox; when nothing was saved it only closes the sheet. */
export function sheetHint(opening: ShareOpening | null): string {
  const keepsItem = opening === null || opening.kind === 'saved';
  return keepsItem ? 'Swipe down to leave it in Inbox' : 'Swipe down to close';
}
