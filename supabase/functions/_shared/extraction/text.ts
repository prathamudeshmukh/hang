const WORDS_PER_MINUTE = 230;
const ELLIPSIS = '…';

export function truncate(text: string, maxLength: number): string {
  const singleLine = text.split('\n')[0]?.trim() ?? '';
  return singleLine.length <= maxLength ? singleLine : `${singleLine.slice(0, maxLength - 1).trimEnd()}${ELLIPSIS}`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

export function readingMinutes(text: string): number {
  return Math.max(1, Math.ceil(countWords(text) / WORDS_PER_MINUTE));
}

export function isHtml(contentType: string): boolean {
  return /text\/html|application\/xhtml\+xml/i.test(contentType);
}
