import { dayWords } from '../home/homeCopy.ts';
import type { ExistingItem, ExistingOpening, ShareOpening } from './shareCapture.ts';

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

const INBOX = 'Inbox';

/** A re-shared link's note (#19). `struck` is drawn with the finish stroke before the text. */
export interface ExistingNote {
  readonly struck: 'unread' | null;
  readonly text: string;
}

const placeWords = ({ place }: ExistingItem) => (place ? `in ${place.name}` : 'in your Inbox');

export function existingNote(opening: ExistingOpening, today: Date): ExistingNote {
  const { item } = opening;
  if (item.readAt) return { struck: 'unread', text: `read · ${dayWords(new Date(item.readAt), today)} · ${placeWords(item)}` };
  const where = item.place ? `already hanging ${placeWords(item)}` : `already ${placeWords(item)}`;
  return { struck: null, text: `${where} · since ${dayWords(new Date(item.createdAt), today)}` };
}

/** Save files a new share once a place is picked; a re-shared one only when the pick moves it. */
export function canSave(opening: ShareOpening | null, selected: string | null): boolean {
  if (selected === null) return false;
  if (opening?.kind === 'saved') return true;
  return opening?.kind === 'existing' && selected !== opening.item.place?.id;
}

/** Swiping down keeps the share where it is (the Inbox for a new one); when nothing was saved it only closes. */
export function sheetHint(opening: ShareOpening | null, selected: string | null = null): string {
  if (opening?.kind === 'existing') {
    const { place } = opening.item;
    if (place && selected !== null && selected !== place.id) return `Moves it from ${place.name}`;
    return `Swipe down to leave it in ${place?.name ?? INBOX}`;
  }
  const keepsItem = opening === null || opening.kind === 'saved';
  return keepsItem ? `Swipe down to leave it in ${INBOX}` : 'Swipe down to close';
}
