import { errorName, readItemRequest, reply, STATUS } from '../_shared/edge/itemRequest.ts';
import { toItemPatch } from './itemPatch.ts';
import type { ClaimedItem, ExtractItem, ItemStore, Logger } from './types.ts';

export interface ExtractDeps {
  readonly secret: string;
  readonly store: ItemStore;
  readonly extractItem: ExtractItem;
  readonly log: Logger;
}

async function extractAndSave(item: ClaimedItem, deps: ExtractDeps): Promise<Response> {
  try {
    const { extracted, errors } = await deps.extractItem(item);
    errors.forEach(({ adapter }) => deps.log.warn('extract.adapter_failed', { item_id: item.id, adapter }));
    await deps.store.complete(item.id, toItemPatch(item, extracted));
    deps.log.info('extract.ready', { item_id: item.id, adapter: extracted.adapter, kind: extracted.kind });
    return reply(STATUS.ok, 'ready');
  } catch (error) {
    deps.log.error('extract.failed', { item_id: item.id, error: errorName(error) });
    await deps.store.fail(item.id, 'internal');
    return reply(STATUS.internal, 'failed');
  }
}

/** POST { item_id } from the items insert trigger → claim → registry → write back (SPEC §4). */
export function makeExtractHandler(deps: ExtractDeps): (req: Request) => Promise<Response> {
  return async (req) => {
    const request = await readItemRequest(req, deps.secret);
    if ('rejection' in request) return request.rejection;
    const item = await deps.store.claim(request.itemId);
    if (!item) {
      deps.log.info('extract.skipped', { item_id: request.itemId });
      return reply(STATUS.ok, 'skipped');
    }
    return extractAndSave(item, deps);
  };
}
