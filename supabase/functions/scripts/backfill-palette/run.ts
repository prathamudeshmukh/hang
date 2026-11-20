/**
 * #85: give palettes made before `vibrant` existed their vibrant colour, read from the stored thumbnail.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-palette/run.ts           # dry run
 *   SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… deno run --allow-net --allow-env scripts/backfill-palette/run.ts --apply   # writes
 *
 * Never refetches the original image: it downloads each live item's thumbnail from Storage and adds `vibrant` to its
 * palette, keeping the other colours. Writing bumps `updated_at`, so phones pull the change. Prints ids and counts
 * only. Safe to run again: it skips palettes that already have `vibrant`, even a null one.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { decode, Image } from 'imagescript';
import { paletteOf } from '../../media/palette.ts';
import { type PaletteItem, type PaletteStore, runPaletteBackfill } from './backfill.ts';

const PAGE = 1000;
const BUCKET = 'media';

interface ItemRow {
  readonly id: string;
  readonly thumb_path: string;
  readonly palette: Record<string, unknown> & PaletteItem['palette'];
}

function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function failIf(error: { code?: string } | null, step: string): void {
  if (error) throw new Error(`palette backfill ${step} failed (${error.code ?? 'unknown'})`);
}

async function listAll(client: SupabaseClient): Promise<readonly ItemRow[]> {
  const rows: ItemRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await client
      .from('items')
      .select('id, thumb_path, palette')
      .not('thumb_path', 'is', null)
      .not('palette', 'is', null)
      .is('deleted_at', null)
      .order('id')
      .range(from, from + PAGE - 1);
    failIf(error, 'list');
    rows.push(...((data ?? []) as ItemRow[]));
    if ((data ?? []).length < PAGE) return rows;
  }
}

function supabaseStore(client: SupabaseClient): PaletteStore {
  return {
    listWithoutVibrant: async () =>
      (await listAll(client)).filter(({ palette }) => !('vibrant' in palette)).map((row) => ({ id: row.id, thumbPath: row.thumb_path, palette: row.palette })),
    savePalette: async (id, palette) => {
      failIf((await client.from('items').update({ palette }).eq('id', id)).error, 'save');
    },
  };
}

async function vibrantFromThumbnail(client: SupabaseClient, item: PaletteItem): Promise<string | null> {
  const { data, error } = await client.storage.from(BUCKET).download(item.thumbPath);
  if (error || !data) throw new Error('thumbnail download failed');
  const decoded = await decode(new Uint8Array(await data.arrayBuffer()));
  const frame = decoded instanceof Image ? decoded : decoded[0];
  if (!frame) throw new Error('thumbnail has no frames');
  return paletteOf(new Uint8Array(frame.bitmap))?.vibrant ?? null;
}

if (import.meta.main) {
  const client = createClient(required('SUPABASE_URL'), required('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  await runPaletteBackfill({
    store: supabaseStore(client),
    vibrantOf: (item) => vibrantFromThumbnail(client, item),
    apply: Deno.args.includes('--apply'),
    print: console.log,
  });
}
