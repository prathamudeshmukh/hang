import { countWords } from '../_shared/extraction/text.ts';
import type { Extracted } from '../_shared/extraction/types.ts';
import type { ClaimedItem, ContentRow } from './types.ts';

/** An article's reader content (SPEC §5 `item_content`), or null when there's nothing to read in Hang (#61). */
export function toItemContent(item: ClaimedItem, extracted: Extracted): ContentRow | null {
  const text = extracted.contentText?.trim();
  if (extracted.kind !== 'article' || !text || !extracted.contentHtml) return null;
  return { item_id: item.id, user_id: item.userId, html: extracted.contentHtml, text, word_count: countWords(text) };
}
