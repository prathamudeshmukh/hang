import { makeStyles } from '@/theme/theme';
import { RADIUS, SPACE } from '@/theme/tokens';
import { textStyle } from '@/theme/typeScale';

/** DESIGN.md Home (#106): the large cell takes two thirds of a square tile; hairline wall gaps, like the icon's tiles. */
const TILE = {
  bigCell: 2,
  smallCell: 1,
  cellGap: SPACE.hair,
  columnGap: SPACE.inset,
  rowGap: SPACE.margin,
  wordsLines: 5,
  wordsPadding: 8,
  perRow: 2,
} as const;

export const WORDS_LINES = TILE.wordsLines;
export const TILES_PER_ROW = TILE.perRow;
export const TILE_COLUMN_GAP = TILE.columnGap;

const square = { aspectRatio: 1, borderRadius: RADIUS.print, overflow: 'hidden' } as const;

export const useRoomTileStyles = makeStyles(({ color }) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: TILE.columnGap, rowGap: TILE.rowGap },
  mosaic: { ...square, flexDirection: 'row', gap: TILE.cellGap, backgroundColor: color.wall },
  big: { flex: TILE.bigCell },
  smallColumn: { flex: TILE.smallCell, gap: TILE.cellGap },
  small: { flex: 1 },
  cell: { flex: 1, backgroundColor: color.raised },
  words: { flex: 1, backgroundColor: color.raised, padding: TILE.wordsPadding },
  label: { flexDirection: 'row', alignItems: 'baseline', gap: SPACE.chip, marginTop: SPACE.caption },
  name: { flex: 1 },
  newFrame: { ...square, borderWidth: 1, borderColor: color.rule, alignItems: 'center', justifyContent: 'center' },
  newField: { marginTop: SPACE.caption, gap: SPACE.hair },
  input: { ...textStyle('titleS'), color: color.ink, padding: 0, borderBottomWidth: 1, borderColor: color.ink3 },
}));
