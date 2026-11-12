import { z } from 'zod';
import { hasBearerSecret } from './secret.ts';

/** The request every item trigger sends (SPEC §4): POST, shared secret, `{ item_id }` and nothing else. */
const requestBody = z.object({ item_id: z.uuid() });

export const STATUS = { ok: 200, badRequest: 400, unauthorized: 401, notAllowed: 405, internal: 500 } as const;

export function reply(status: number, outcome: string): Response {
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

export type ItemRequest = { readonly itemId: string } | { readonly rejection: Response };

export async function readItemRequest(req: Request, secret: string): Promise<ItemRequest> {
  if (req.method !== 'POST') return { rejection: reply(STATUS.notAllowed, 'method not allowed') };
  if (!hasBearerSecret(req, secret)) return { rejection: reply(STATUS.unauthorized, 'unauthorized') };
  const itemId = await readItemId(req);
  return itemId ? { itemId } : { rejection: reply(STATUS.badRequest, 'item_id required') };
}

/** Only the error's class: messages may quote a URL (fetch, DB), and URLs never reach logs (SPEC §7). */
export function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error;
}
