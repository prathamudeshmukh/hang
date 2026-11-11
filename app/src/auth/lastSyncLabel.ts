import type { LastSync } from './types.ts';

/** One line for the Phase 1 home screen. */
export function lastSyncLabel(lastSync: LastSync): string {
  if (lastSync.kind === 'never') return 'Not synced yet';
  if (lastSync.kind === 'error') return `Last sync failed: ${lastSync.message}`;
  const { pushed, failed, waiting, pulled } = lastSync.report;
  const received = pulled.collections + pulled.items + pulled.item_content;
  const parts = [`sent ${pushed}`, `received ${received}`, failed > 0 ? `${failed} failed` : null, waiting ? 'retrying soon' : null];
  return `Synced: ${parts.filter(Boolean).join(' · ')}`;
}
