import type { SyncTriggerPorts } from './syncTriggers.ts';

const TOPIC_PREFIX = 'items-changes';
const FAILED_STATUSES: ReadonlySet<string> = new Set(['CHANNEL_ERROR', 'TIMED_OUT']);

/** Every change to the user's items; RLS limits it to their rows (init migration, `supabase_realtime`). */
export const ITEMS_CHANGES = { event: '*', schema: 'public', table: 'items' } as const;

interface RealtimeChannelLike {
  on(type: 'postgres_changes', filter: typeof ITEMS_CHANGES, callback: () => void): RealtimeChannelLike;
  subscribe(callback: (status: string, error?: Error) => void): RealtimeChannelLike;
}

/** The slice of the Supabase client this needs, so tests can fake it. */
export interface RealtimeClient {
  channel(name: string): RealtimeChannelLike;
  removeChannel(channel: RealtimeChannelLike): Promise<unknown>;
}

export interface ItemsRealtimeDeps {
  readonly client: RealtimeClient;
  readonly log: (message: string) => void;
}

/**
 * A Realtime port for the sync triggers: a bare "something changed" signal, never the payload.
 * Each subscription gets its own topic: realtime-js hands back a same-named channel that is still
 * leaving, and subscribing to that one silently does nothing.
 */
export function createItemsRealtime({ client, log }: ItemsRealtimeDeps): SyncTriggerPorts['realtime'] {
  let opened = 0;
  return {
    subscribe({ onChange, onError }) {
      let open = true;
      opened += 1;
      const channel = client
        .channel(`${TOPIC_PREFIX}-${opened}`)
        .on('postgres_changes', ITEMS_CHANGES, () => {
          if (open) onChange();
        })
        .subscribe((status, error) => {
          if (open && FAILED_STATUSES.has(status)) onError(error ? `${status} (${error.message})` : status);
        });
      return () => {
        open = false;
        client.removeChannel(channel).catch((error: unknown) => {
          log(`Could not close the Realtime channel: ${error instanceof Error ? error.message : String(error)}`);
        });
      };
    },
  };
}
