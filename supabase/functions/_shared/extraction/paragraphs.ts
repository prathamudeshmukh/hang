import { parseDocument } from './dom.ts';

/** Paragraphs in `item_content.text` are separated by one blank line (#61). */
export const PARAGRAPH_BREAK = '\n\n';

/** A `<p>` inside these is a caption, a list item or a table cell, not the article's running text. */
const NOT_RUNNING_TEXT = 'figure, figcaption, li, pre, table';

/** What the page already shows elsewhere, so the opening doesn't start by repeating it. */
export interface Repeats {
  readonly title?: string;
  readonly byline?: string;
}

/** A byline paragraph often reads *By A. Writer* while the page's metadata says *A. Writer*. */
const BY_PREFIX = /^by\s+/i;

const collapse = (text: string) => text.replace(/\s+/g, ' ').trim();
const comparable = (text: string) => text.replace(BY_PREFIX, '').toLocaleLowerCase();

/** The article's running text, one paragraph per `<p>` (#61): what search indexes and the feed opens on. */
export function paragraphText(contentHtml: string, repeats: Repeats): string {
  const echoes = [repeats.title, repeats.byline].map((value) => comparable(collapse(value ?? ''))).filter(Boolean);
  return [...parseDocument(contentHtml).querySelectorAll('p')]
    .filter((p) => !p.closest(NOT_RUNNING_TEXT))
    .map((p) => collapse(p.textContent ?? ''))
    .filter((paragraph) => paragraph && !echoes.includes(comparable(paragraph)))
    .join(PARAGRAPH_BREAK);
}
