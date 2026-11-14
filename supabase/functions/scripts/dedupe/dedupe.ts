import { type DedupeRow, type Merge, planMerges } from './plan.ts';

export interface DedupeStore {
  readonly listLive: () => Promise<readonly DedupeRow[]>;
  readonly listLiveCollections: () => Promise<ReadonlySet<string>>;
  /**
   * Patches the survivor, then soft-deletes the copies (their deletes sync like any other). False, removing nothing,
   * when the survivor is no longer live: the app may have changed things since the plan was read.
   */
  readonly apply: (merge: Merge) => Promise<boolean>;
}

export interface DedupeRun {
  readonly store: DedupeStore;
  readonly apply: boolean;
  /** Ids and counts only: addresses can say what someone reads. */
  readonly print: (line: string) => void;
}

const describeMerge = ({ keep, patch, remove }: Merge) => {
  const fields = Object.keys(patch);
  return `keep ${keep} ← ${remove.join(', ')}${fields.length > 0 ? ` (${fields.join(', ')})` : ''}`;
};

/** #19's one-off clean-up of copies saved before the share sheet spotted them. Dry run unless `apply`. */
export async function runDedupe({ store, apply, print }: DedupeRun): Promise<readonly Merge[]> {
  const merges = planMerges(await store.listLiveCollections(), await store.listLive());
  merges.forEach((merge) => print(describeMerge(merge)));
  const removed = merges.reduce((total, { remove }) => total + remove.length, 0);
  print(`${merges.length} links with copies, ${removed} copies to remove${apply ? '' : ' (dry run: nothing changed)'}`);
  for (const merge of apply ? merges : []) {
    if (!(await store.apply(merge))) print(`skipped ${merge.keep}: no longer live, its copies kept`);
  }
  if (apply) print('done');
  return merges;
}
