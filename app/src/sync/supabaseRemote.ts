import type { SupabaseClient } from '@supabase/supabase-js';
import { primaryKeyColumn } from '../db/rowShape.ts';
import type { SyncTableName } from '../db/schema.ts';
import type { Cursor } from './cursor.ts';
import { RemoteError, type PullRequest, type PushRequest, type SyncRemote } from './types.ts';

const NETWORK_FAILURE = 0;
const UNAUTHORIZED = 401;
const REQUEST_TIMEOUT = 408;
const TOO_MANY_REQUESTS = 429;
const SERVER_ERROR = 500;
/** PostgREST's schema cache lags a migration for a moment during a deploy; asking again works. */
const STALE_SCHEMA_CODES = ['PGRST204', 'PGRST205'];

/** What postgrest-js resolves with; `status` is 0 when fetch itself failed. */
interface PostgrestResult {
  readonly data: unknown;
  readonly error: { readonly message: string; readonly code?: string } | null;
  readonly status: number;
}

/**
 * A 401 means the session expired or is missing, which a refresh or a sign-in fixes, so it retries.
 * Other 4xx (bad payload, RLS refusing the row) would fail the same way again.
 */
function isRetryable(status: number, code: string | undefined): boolean {
  if (code && STALE_SCHEMA_CODES.includes(code)) return true;
  return [NETWORK_FAILURE, UNAUTHORIZED, REQUEST_TIMEOUT, TOO_MANY_REQUESTS].includes(status) || status >= SERVER_ERROR;
}

function check(result: PostgrestResult, action: string): unknown {
  if (!result.error) return result.data;
  throw new RemoteError(`${action} failed (${result.status}): ${result.error.message}`, {
    retryable: isRetryable(result.status, result.error.code),
    cause: result.error,
  });
}

/** PostgREST reserves `.`, `:` and `,` inside `or=`; timestamps have the first two, so values are quoted. */
const quoted = (value: string) => `"${value.replace(/[\\"]/g, '\\$&')}"`;

function rowsOf(result: PostgrestResult, action: string): readonly unknown[] {
  const data = check(result, action);
  if (data === null) return [];
  if (!Array.isArray(data)) throw new RemoteError(`${action} returned something other than rows`, { retryable: false });
  return data;
}

function afterCursor(key: string, { updatedAt, id }: Cursor): string {
  const at = quoted(updatedAt);
  return `updated_at.gt.${at},and(updated_at.eq.${at},${key}.gt.${quoted(id)})`;
}

/** The engine's view of Supabase (SyncRemote): PostgREST over the signed-in user's JWT, so RLS scopes every query. */
export function createSupabaseRemote(client: SupabaseClient): SyncRemote {
  async function pull({ tableName, after, limit }: PullRequest): Promise<readonly unknown[]> {
    const key = primaryKeyColumn(tableName);
    const ordered = client.from(tableName).select('*').order('updated_at').order(key).limit(limit);
    const result = await (after ? ordered.or(afterCursor(key, after)) : ordered);
    return rowsOf(result, `Pull ${tableName}`);
  }

  /**
   * Outbox upserts are creates. If one committed but its response was lost, the retry must not overwrite
   * what the server filled in since (extraction results, a filing from another device): ignore the duplicate.
   */
  async function upsert(tableName: SyncTableName, payload: PushRequest['payload']): Promise<void> {
    const result = await client.from(tableName).upsert(payload, { onConflict: primaryKeyColumn(tableName), ignoreDuplicates: true });
    check(result, `Upsert ${tableName}`);
  }

  /** PostgREST answers a PATCH that matched nothing with success, so the matched rows are read back. */
  async function patch({ tableName, rowId, payload }: PushRequest): Promise<void> {
    const key = primaryKeyColumn(tableName);
    const result = await client.from(tableName).update(payload).eq(key, rowId).select(key);
    const rows = rowsOf(result, `Patch ${tableName}`);
    if (rows.length === 0) throw new RemoteError(`Patch ${tableName} ${rowId} matched no row`, { retryable: false });
  }

  return {
    pull,
    push: (request) => (request.op === 'upsert' ? upsert(request.tableName, request.payload) : patch(request)),
  };
}
