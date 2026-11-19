import { expect } from '@std/expect';
import { beforeEach, describe, it } from '@std/testing/bdd';
import type { Palette } from '../../media/palette.ts';
import { type PaletteItem, type PaletteStore, runPaletteBackfill } from './backfill.ts';

const OLD: Omit<Palette, 'vibrant'> = { dominant: '#fafafa', muted: '#888888', onDominant: '#1B1A17' };
const item = (id: string): PaletteItem => ({ id, thumbPath: `u1/thumbs/${id}.webp`, palette: OLD });

describe('runPaletteBackfill', () => {
  let saved: Array<{ id: string; palette: Palette }>;
  let lines: string[];
  beforeEach(() => {
    saved = [];
    lines = [];
  });

  const store = (items: readonly PaletteItem[]): PaletteStore => ({
    listWithoutVibrant: () => Promise.resolve(items),
    savePalette: (id, palette) => (saved.push({ id, palette }), Promise.resolve()),
  });

  const vibrants: Record<string, string | null> = { a: '#dc1e28', grey: null };
  const run = (items: readonly PaletteItem[], apply: boolean) =>
    runPaletteBackfill({
      store: store(items),
      vibrantOf: ({ id }) => (id in vibrants ? Promise.resolve(vibrants[id] ?? null) : Promise.reject(new Error('Object not found u1/thumbs/x.webp'))),
      apply,
      print: (line) => lines.push(line),
    });

  it('adds vibrant to the palette and keeps the colours already there', async () => {
    await run([item('a'), item('grey')], true);
    expect(saved).toEqual([{ id: 'a', palette: { ...OLD, vibrant: '#dc1e28' } }, { id: 'grey', palette: { ...OLD, vibrant: null } }]);
  });

  it('writes nothing on a dry run but says what it would do', async () => {
    await run([item('a'), item('grey')], false);
    expect(saved).toEqual([]);
    expect(lines.at(-1)).toBe('2 palettes without vibrant: 1 vivid, 1 without, 0 skipped (dry run: nothing changed)');
  });

  it('skips an item whose thumbnail cannot be read, printing its id and never its path', async () => {
    await run([item('missing'), item('a')], true);
    expect(saved.map(({ id }) => id)).toEqual(['a']);
    expect(lines.join('\n')).not.toContain('thumbs/');
  });
});
