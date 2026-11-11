import type { Item, ItemStatus } from '../db/schema.ts';

/** One item as the Phase 1 lists show it. */
export interface ItemRow {
  readonly id: string;
  readonly title: string;
  readonly host: string;
  readonly url: string;
  /** Status worth knowing about (pending, failed, waiting to sync), or null when there is nothing to say. */
  readonly note: string | null;
  readonly inInbox: boolean;
}

const STATUS_NOTE: Readonly<Record<ItemStatus, string | null>> = {
  pending: 'pending',
  extracting: 'fetching details',
  ready: null,
  failed: 'couldn’t fetch details',
};
const WAITING_TO_SYNC = 'waiting to sync';
const LEADING_WWW = /^www\./;

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(LEADING_WWW, '');
  } catch {
    return url;
  }
}

export function rowNote({ status, queued }: { readonly status: ItemStatus; readonly queued: boolean }): string | null {
  const parts = [STATUS_NOTE[status], queued ? WAITING_TO_SYNC : null].filter((part) => part !== null);
  return parts.length > 0 ? parts.join(' · ') : null;
}

/** `queued`: the item still has outbox entries, so the server may not have its latest state. */
export function toItemRow(item: Item, queued: boolean): ItemRow {
  return {
    id: item.id,
    title: item.title ?? item.sharedTitle ?? item.sourceUrl,
    host: hostOf(item.sourceUrl),
    url: item.sourceUrl,
    note: rowNote({ status: item.status, queued }),
    inInbox: item.collectionId === null,
  };
}
