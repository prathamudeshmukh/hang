import { youTubeThumbnail } from '../../_shared/extraction/youTubeThumbnail.ts';

/** A live item whose picture is YouTube's 4:3 `hqdefault`, with the 16:9 frame letterboxed inside it. */
export interface LetterboxedItem {
  readonly id: string;
  readonly imageUrl: string;
}

export interface NewPicture {
  readonly itemId: string;
  /** The address it replaces: the write only lands while the item still has it. */
  readonly from: string;
  readonly imageUrl: string;
}

export interface BackfillStore {
  readonly listLetterboxed: () => Promise<readonly LetterboxedItem[]>;
  /** Writes `image_url` only; a new `image_url` wakes the media step, which makes a new thumbnail at a new path. */
  readonly savePicture: (picture: NewPicture) => Promise<void>;
}

export interface BackfillRun {
  readonly store: BackfillStore;
  readonly imageExists: (url: string) => Promise<boolean>;
  readonly apply: boolean;
  /** Ids and counts only: addresses can say what someone watches. */
  readonly print: (line: string) => void;
}

const LETTERBOXED = /^https:\/\/i\.ytimg\.com\/vi\/([A-Za-z0-9_-]{11})\/hqdefault\.jpg$/;

async function newPictureFor(item: LetterboxedItem, run: BackfillRun): Promise<NewPicture | null> {
  const videoId = LETTERBOXED.exec(item.imageUrl)?.[1];
  if (!videoId) {
    run.print(`skipped ${item.id}: no video id`);
    return null;
  }
  const thumbnail = await youTubeThumbnail(videoId, run.imageExists);
  return { itemId: item.id, from: item.imageUrl, imageUrl: thumbnail.url };
}

/** #107's one-off: YouTube items saved with the letterboxed picture get the 16:9 one. Dry run unless `apply`. */
export async function runBackfill(run: BackfillRun): Promise<number> {
  const found = await run.store.listLetterboxed();
  let changed = 0;
  for (const item of found) {
    const picture = await newPictureFor(item, run);
    if (!picture) continue;
    changed += 1;
    if (run.apply) await run.store.savePicture(picture);
  }
  const suffix = run.apply ? '' : ' (dry run: nothing changed)';
  run.print(`${found.length} letterboxed YouTube pictures: ${changed} to change${suffix}`);
  return changed;
}
