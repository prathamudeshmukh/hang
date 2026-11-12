/** DESIGN.md §10: past 150% system font scale, two columns get too narrow to read. */
const ONE_COLUMN_ABOVE_SCALE = 1.5;

export function columnsFor(fontScale: number): 1 | 2 {
  return fontScale > ONE_COLUMN_ABOVE_SCALE ? 1 : 2;
}
