import type { Palette } from '../../media/palette.ts';

/** A live item with a thumbnail whose palette was made before `vibrant` existed. */
export interface PaletteItem {
  readonly id: string;
  readonly thumbPath: string;
  readonly palette: Omit<Palette, 'vibrant'>;
}

export interface PaletteStore {
  readonly listWithoutVibrant: () => Promise<readonly PaletteItem[]>;
  readonly savePalette: (id: string, palette: Palette) => Promise<void>;
}

export interface PaletteBackfillRun {
  readonly store: PaletteStore;
  /** Reads the stored thumbnail and returns its vibrant colour (null when it has none). */
  readonly vibrantOf: (item: PaletteItem) => Promise<string | null>;
  readonly apply: boolean;
  /** Ids and counts only: thumbnail paths carry the owner's id. */
  readonly print: (line: string) => void;
}

const SKIPPED = Symbol('skipped');

async function vibrantOrSkip(run: PaletteBackfillRun, item: PaletteItem): Promise<string | null | typeof SKIPPED> {
  try {
    return await run.vibrantOf(item);
  } catch (error) {
    run.print(`skipped ${item.id}: ${error instanceof Error ? error.name : 'error'}`);
    return SKIPPED;
  }
}

type Outcome = 'vivid' | 'without' | 'skipped';

async function backfillOne(run: PaletteBackfillRun, item: PaletteItem): Promise<Outcome> {
  const vibrant = await vibrantOrSkip(run, item);
  if (vibrant === SKIPPED) return 'skipped';
  if (run.apply) await run.store.savePalette(item.id, { ...item.palette, vibrant });
  return vibrant ? 'vivid' : 'without';
}

/** #85's one-off: palettes made before `vibrant` get it from their stored thumbnail. Dry run unless `apply`. */
export async function runPaletteBackfill(run: PaletteBackfillRun): Promise<number> {
  const items = await run.store.listWithoutVibrant();
  const outcomes: Outcome[] = [];
  // One at a time: each step downloads a thumbnail.
  for (const item of items) outcomes.push(await backfillOne(run, item));
  const count = (outcome: Outcome) => outcomes.filter((each) => each === outcome).length;
  const suffix = run.apply ? '' : ' (dry run: nothing changed)';
  run.print(`${items.length} palettes without vibrant: ${count('vivid')} vivid, ${count('without')} without, ${count('skipped')} skipped${suffix}`);
  return items.length - count('skipped');
}
