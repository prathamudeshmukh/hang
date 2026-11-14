import { linkKey } from '../../../supabase/functions/_shared/links/linkKey.ts';
import type { Item } from '../db/schema.ts';

export type LinkRow = Pick<Item, 'id' | 'sourceUrl' | 'canonicalUrl' | 'createdAt'>;

const keysOf = ({ sourceUrl, canonicalUrl }: LinkRow) => [linkKey(sourceUrl), canonicalUrl ? linkKey(canonicalUrl) : null];

/** The live item that is this link already (#19), oldest first so its "since" is the first time it was saved. */
export function findSameLink(rows: readonly LinkRow[], sharedUrl: string): LinkRow | null {
  const key = linkKey(sharedUrl);
  if (key === null) return null;
  const matches = rows.filter((row) => keysOf(row).includes(key));
  return matches.reduce<LinkRow | null>((oldest, row) => (oldest === null || Date.parse(row.createdAt) < Date.parse(oldest.createdAt) ? row : oldest), null);
}
