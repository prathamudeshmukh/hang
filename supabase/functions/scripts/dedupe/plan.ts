import { linkKey } from '../../_shared/links/linkKey.ts';

/** The columns the clean-up reads from each live item (#19). */
export interface DedupeRow {
  readonly id: string;
  readonly user_id: string;
  readonly source_url: string;
  readonly canonical_url: string | null;
  readonly status: string;
  readonly collection_id: string | null;
  readonly created_at: string;
  readonly updated_at: string;
  readonly read_at: string | null;
  readonly progress: number | null;
  readonly last_opened_at: string | null;
}

type Carried = Pick<DedupeRow, 'created_at' | 'collection_id' | 'read_at' | 'progress' | 'last_opened_at'>;

export interface Merge {
  readonly keep: string;
  /** Only the fields the survivor doesn't already have. */
  readonly patch: Partial<Carried>;
  readonly remove: readonly string[];
}

const time = (value: string) => Date.parse(value);
const oldestFirst = (a: DedupeRow, b: DedupeRow) => time(a.created_at) - time(b.created_at) || a.id.localeCompare(b.id);
const userKey = (row: DedupeRow, url: string | null) => {
  const key = url ? linkKey(url) : null;
  return key === null ? null : `${row.user_id} ${key}`;
};

/**
 * A copy's own address always links it; its canonical_url only when that is another item's own address. Canonicals
 * are wherever a fetch landed after redirects, so unrelated articles can share one (a consent or login page).
 */
function keysOf(row: DedupeRow, sourceKeys: ReadonlySet<string>): readonly string[] {
  const own = userKey(row, row.source_url);
  const canonical = userKey(row, row.canonical_url);
  return [own, canonical !== null && sourceKeys.has(canonical) ? canonical : null].filter((key) => key !== null);
}

/** Items sharing a key end up in one group (a short link and its article meet through canonical_url). */
function groupsOf(rows: readonly DedupeRow[]): readonly (readonly DedupeRow[])[] {
  const sourceKeys = new Set(rows.map((row) => userKey(row, row.source_url)).filter((key) => key !== null));
  const groupOfKey = new Map<string, Set<DedupeRow>>();
  for (const row of rows) {
    const keys = keysOf(row, sourceKeys);
    const met = new Set(keys.flatMap((key) => { const group = groupOfKey.get(key); return group ? [group] : []; }));
    const group = new Set([row, ...[...met].flatMap((other) => [...other])]);
    for (const member of group) for (const key of keysOf(member, sourceKeys)) groupOfKey.set(key, group);
  }
  return [...new Set(groupOfKey.values())].map((group) => [...group].sort(oldestFirst));
}

/** The oldest copy the server read; a failed or unread copy only when none was read. */
function survivorOf(group: readonly DedupeRow[]): DedupeRow {
  return group.find((row) => row.status === 'ready') ?? (group[0] as DedupeRow);
}

const latest = (values: readonly (string | null)[]) => values.filter((v) => v !== null).sort((a, b) => time(b) - time(a))[0] ?? null;
const earliest = (values: readonly (string | null)[]) => values.filter((v) => v !== null).sort((a, b) => time(a) - time(b))[0] ?? null;

/**
 * A live collection beats the Inbox; between collections, the copy changed most recently. `updated_at` also moves on
 * enrichment, so this is a stand-in for "filed last" (there's no filed-at column).
 */
function placeOf(group: readonly DedupeRow[], liveCollections: ReadonlySet<string>): string | null {
  const filed = group
    .filter((row) => row.collection_id !== null && liveCollections.has(row.collection_id))
    .sort((a, b) => time(b.updated_at) - time(a.updated_at));
  return filed[0]?.collection_id ?? null;
}

function carriedOf(group: readonly DedupeRow[], liveCollections: ReadonlySet<string>): Carried {
  const progress = group.map((row) => row.progress).filter((value) => value !== null);
  return {
    created_at: (group[0] as DedupeRow).created_at,
    collection_id: placeOf(group, liveCollections),
    read_at: earliest(group.map((row) => row.read_at)),
    progress: progress.length > 0 ? Math.max(...progress) : null,
    last_opened_at: latest(group.map((row) => row.last_opened_at)),
  };
}

/** Only what changes; a survivor in a deleted collection keeps its pointer unless a live place was found. */
function patchFor(survivor: DedupeRow, carried: Carried): Partial<Carried> {
  return Object.fromEntries(
    Object.entries(carried).filter(([field, value]) => survivor[field as keyof Carried] !== value && !(field === 'collection_id' && value === null)),
  );
}

/** One merge per set of copies: keep the best-read copy with the first save's date and the best of the others. */
export function planMerges(liveCollections: ReadonlySet<string>, rows: readonly DedupeRow[]): readonly Merge[] {
  return groupsOf(rows)
    .filter((group) => group.length > 1)
    .map((group) => {
      const survivor = survivorOf(group);
      const remove = group.filter((row) => row !== survivor).map((row) => row.id);
      return { keep: survivor.id, patch: patchFor(survivor, carriedOf(group, liveCollections)), remove };
    });
}
