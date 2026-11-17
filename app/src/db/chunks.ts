/** Under SQLite's oldest bound-parameter limit (999), so any build takes it. */
const IDS_PER_QUERY = 500;

/** Splits ids into batches small enough for one `in (…)` query. */
export function chunksOf(ids: readonly string[]): readonly (readonly string[])[] {
  return Array.from({ length: Math.ceil(ids.length / IDS_PER_QUERY) }, (_, n) => ids.slice(n * IDS_PER_QUERY, (n + 1) * IDS_PER_QUERY));
}
