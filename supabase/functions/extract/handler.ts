import { z } from 'zod';
import { toItemPatch } from './itemPatch.ts';
import { hasBearerSecret } from './secret.ts';
import type { ClaimedItem, ExtractItem, ItemStore, Logger } from './types.ts';

export interface ExtractDeps {
  readonly secret: string;
  readonly store: ItemStore;
  readonly extractItem: ExtractItem;
  readonly log: Logger;
}

const requestBody = z.object({ item_id: z.uuid() });

const STATUS = { ok: 200, badRequest: 400, unauthorized: 401, notAllowed: 405, internal: 500 } as const;

function reply(status: number, outcome: string): Response {
  return Response.json({ outcome }, { status });
}

async function readItemId(req: Request): Promise<string | undefined> {
  try {
    const parsed = requestBody.safeParse(await req.json());
    return parsed.success ? parsed.data.item_id : undefined;
  } catch {
    return undefined;
  }
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}

async function extractAndSave(item: ClaimedItem, deps: ExtractDeps): Promise<Response> {
  try {
    const { extracted, errors } = await deps.extractItem(item);
    errors.forEach(({ adapter }) => deps.log.warn('extract.adapter_failed', { item_id: item.id, adapter }));
    await deps.store.complete(item.id, toItemPatch(item, extracted));
    deps.log.info('extract.ready', { item_id: item.id, adapter: extracted.adapter, kind: extracted.kind });
    return reply(STATUS.ok, 'ready');
  } catch (error) {
    // The message may quote the URL (fetch, DB), so only the error's class is logged.
    deps.log.error('extract.failed', { item_id: item.id, error: errorName(error) });
    await deps.store.fail(item.id, 'internal');
    return reply(STATUS.internal, 'failed');
  }
}

/** POST { item_id } from the items insert trigger → claim → registry → write back (SPEC §4). */
export function makeExtractHandler(deps: ExtractDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    if (req.method !== 'POST') return reply(STATUS.notAllowed, 'method not allowed');
    if (!hasBearerSecret(req, deps.secret)) return reply(STATUS.unauthorized, 'unauthorized');
    const itemId = await readItemId(req);
    if (!itemId) return reply(STATUS.badRequest, 'item_id required');
    const item = await deps.store.claim(itemId);
    if (!item) {
      deps.log.info('extract.skipped', { item_id: itemId });
      return reply(STATUS.ok, 'skipped');
    }
    return extractAndSave(item, deps);
  };
}
