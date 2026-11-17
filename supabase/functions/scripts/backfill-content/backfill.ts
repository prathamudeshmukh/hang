import type { ClaimedItem, ContentRow } from '../../extract/types.ts';

export interface BackfillStore {
  /** Live, ready articles that have no `item_content` row yet. */
  readonly listArticlesWithoutContent: () => Promise<readonly ClaimedItem[]>;
  readonly saveContent: (content: ContentRow) => Promise<void>;
}

export interface BackfillRun {
  readonly store: BackfillStore;
  /** Refetches the page and returns its reader content, or null when it no longer reads as an article. */
  readonly readContent: (item: ClaimedItem) => Promise<ContentRow | null>;
  readonly apply: boolean;
  /** Ids and counts only: addresses can say what someone reads. */
  readonly print: (line: string) => void;
}

async function readOrNull(run: BackfillRun, item: ClaimedItem): Promise<ContentRow | null> {
  try {
    return await run.readContent(item);
  } catch (error) {
    run.print(`skipped ${item.id}: ${error instanceof Error ? error.name : 'error'}`);
    return null;
  }
}

/** #61's one-off: articles saved before `extract` kept their text get it now. Dry run unless `apply`. */
export async function runBackfill(run: BackfillRun): Promise<number> {
  const articles = await run.store.listArticlesWithoutContent();
  let found = 0;
  for (const item of articles) {
    const content = await readOrNull(run, item);
    if (!content) continue;
    found += 1;
    if (run.apply) await run.store.saveContent(content);
  }
  const suffix = run.apply ? '' : ' (dry run: nothing changed)';
  run.print(`${articles.length} articles without text: ${found} with text found, ${articles.length - found} without${suffix}`);
  return found;
}
