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
 * The one tap handler for an item, wherever it hangs (grid, Home strip, Rediscover). Opens the link
 * until the swipe feed (#31) takes over. Recording the open is bookkeeping: it never stops the read.
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
