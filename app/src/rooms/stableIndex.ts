/** The same index in 0..count-1 for the same id, on every device and every run (#85: icon colour, print colour). */
export function stableIndex(id: string, count: number): number {
  const hash = [...id].reduce((sum, char) => (sum * 31 + char.charCodeAt(0)) >>> 0, 7);
  return hash % count;
}
