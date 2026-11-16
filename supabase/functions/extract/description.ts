/** Matches the `items.description` check; long enough for the feed's five lines (#54). */
export const MAX_DESCRIPTION_LENGTH = 500;
/** Shorter than this is a label ("Home", "Read more"), not a description. */
const MIN_DESCRIPTION_LENGTH = 20;
const ELLIPSIS = '…';

export interface DescriptionSource {
  readonly description: string | undefined;
  readonly title: string | undefined;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

/** Letters and digits only, so "Title!" and "title" compare equal. */
function bareWords(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
}

function capAtWord(value: string): string {
  if (value.length <= MAX_DESCRIPTION_LENGTH) return value;
  const room = value.slice(0, MAX_DESCRIPTION_LENGTH - ELLIPSIS.length);
  const endsOnWord = value[room.length] === ' ';
  const lastSpace = room.lastIndexOf(' ');
  const cut = endsOnWord || lastSpace <= 0 ? room : room.slice(0, lastSpace);
  return `${cut.replace(/[\s,;:.]+$/, '')}${ELLIPSIS}`;
}

/** The page's own description, or null when it's missing, a mere label or the title again (#54). */
export function cleanDescription({ description, title }: DescriptionSource): string | null {
  const collapsed = collapseWhitespace(description ?? '');
  if (collapsed.length < MIN_DESCRIPTION_LENGTH) return null;
  if (title !== undefined && bareWords(collapsed) === bareWords(title)) return null;
  return capAtWord(collapsed);
}
