/** What the one-off backfill scripts share: env, error and paging handling against the hosted project. */

const PAGE = 1000;

type SupabaseError = { code?: string } | null;

export function required(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

/** Says which step failed and its code, never the row it was on. */
export function failIf(error: SupabaseError, step: string): void {
  if (error) throw new Error(`backfill ${step} failed (${error.code ?? 'unknown'})`);
}

/** Reads every page of a query, a thousand rows at a time. */
export async function listAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: SupabaseError }>, step: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await page(from, from + PAGE - 1);
    failIf(error, step);
    rows.push(...(data ?? []));
    if ((data ?? []).length < PAGE) return rows;
  }
}
