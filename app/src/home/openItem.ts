export interface OpenItemPorts {
  readonly markOpened: (id: string) => void;
  readonly openUrl: (url: string) => Promise<void>;
  readonly warn: (message: string) => void;
}

export interface OpenableItem {
  readonly id: string;
  readonly url: string;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * Read/Watch/Open in the feed (#31): records the open, then opens the link until Phase 3 brings the
 * reader and players. Swiping past an item never counts as opening it. Recording is bookkeeping: it
 * never stops the read.
 */
export function createOpenItem({ markOpened, openUrl, warn }: OpenItemPorts) {
  return async function openItem({ id, url }: OpenableItem): Promise<void> {
    try {
      markOpened(id);
    } catch (error) {
      warn(`Could not record an open: ${errorMessage(error)}`);
    }
    await openUrl(url);
  };
}
