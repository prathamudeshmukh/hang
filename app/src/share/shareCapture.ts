import type { CollectionsRepository } from '../db/collectionsRepository.ts';
import type { ItemsRepository } from '../db/itemsRepository.ts';
import type { ParsedShare } from './parseShare.ts';

export interface CollectionChoice {
  readonly id: string;
  readonly name: string;
}

export type ShareOpening =
  | { readonly kind: 'saved'; readonly itemId: string; readonly collections: readonly CollectionChoice[] }
  | { readonly kind: 'notSaved'; readonly reason: 'image' | 'unsupported' }
  /** The cause is logged, not shown: it can be a raw SQLite message. */
  | { readonly kind: 'failed' };

/** Messages and details must never carry the shared URL (it can identify what the user reads). */
export interface ShareLogger {
  warn(message: string, detail: string): void;
  error(message: string, detail: string): void;
}

export interface ShareCaptureDeps {
  /** Resolves once the local database is migrated; a share can be the first thing the process ever runs. */
  readonly ready: () => Promise<void>;
  readonly items: Pick<ItemsRepository, 'save' | 'file'>;
  readonly collections: Pick<CollectionsRepository, 'list'>;
  readonly newId: () => string;
  /** Sends the outbox if signed in. Whatever it can't send stays queued for the next sync. */
  readonly push: () => Promise<void>;
  readonly logger: ShareLogger;
}

const REDACTED_URL = '<url>';

function messageOf(error: unknown): string {
  return error instanceof Error ? `${error.name}: ${error.message}` : String(error);
}

/** Store errors can quote the failed query's params, and with them the shared URL. */
function withoutUrl(text: string, url: string): string {
  return text.split(url).join(REDACTED_URL);
}

/**
 * The share sheet's decisions (PHASE1, slice 6): a link is saved to the Inbox as soon as the sheet opens,
 * so it survives the process dying mid-choice; Save then files it; closing pushes without waiting.
 */
export function createShareCapture({ ready, items, collections, newId, push, logger }: ShareCaptureDeps) {
  let opening: Promise<ShareOpening> | null = null;

  async function saveLink(sourceUrl: string, sharedTitle: string | undefined): Promise<ShareOpening> {
    try {
      await ready();
      const item = items.save({ id: newId(), sourceUrl, sharedTitle });
      const choices = collections.list().map(({ id, name }) => ({ id, name }));
      return { kind: 'saved', itemId: item.id, collections: choices };
    } catch (error) {
      logger.error('Could not save a share', withoutUrl(messageOf(error), sourceUrl));
      return { kind: 'failed' };
    }
  }

  return {
    /** One share per sheet: later calls (re-renders, StrictMode) get the first result instead of saving again. */
    open(share: ParsedShare): Promise<ShareOpening> {
      opening ??= share.kind === 'link' && share.url
        ? saveLink(share.url, share.sharedTitle)
        : Promise.resolve({ kind: 'notSaved', reason: share.kind === 'image' ? 'image' : 'unsupported' });
      return opening;
    },

    /** The item is already safe in the Inbox, so a failure here only leaves it unfiled. */
    file(itemId: string, collectionId: string): void {
      try {
        items.file(itemId, collectionId);
      } catch (error) {
        logger.warn('Could not file a share; it stays in the Inbox', messageOf(error));
      }
    },

    /**
     * The sheet can be swiped away before the save finishes; the push waits for it. Never rejects.
     * Best effort: Android may freeze the process once ShareActivity finishes; the outbox keeps the item.
     */
    async close(): Promise<void> {
      const opened = await opening;
      if (opened?.kind !== 'saved') return;
      try {
        await push();
      } catch (error) {
        logger.warn('Push after share failed', messageOf(error));
      }
    },
  };
}

export type ShareCapture = ReturnType<typeof createShareCapture>;
