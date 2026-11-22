import type { ClaimedItem, PostJson } from '../../extract/types.ts';

/** A live, ready post with no thumbnail, and the picture address it has now (often none). */
export interface PostWithoutThumbnail extends ClaimedItem {
  readonly imageUrl: string | null;
}

/** What a fresh extraction gives a post: its snapshot, and the picture the media step should fetch. */
export interface PostPicture {
  readonly itemId: string;
  readonly post: PostJson;
  readonly imageUrl: string;
}

export interface BackfillStore {
  readonly listPostsWithoutThumbnail: () => Promise<readonly PostWithoutThumbnail[]>;
  /** Writes `post` and `image_url` only; a new `image_url` wakes the media step. */
  readonly savePicture: (picture: PostPicture) => Promise<void>;
}

export interface BackfillRun {
  readonly store: BackfillStore;
  /** Re-extracts the post; null when it still shows no picture (or no longer reads as a post). */
  readonly readPicture: (item: PostWithoutThumbnail) => Promise<PostPicture | null>;
  readonly apply: boolean;
  /** Ids and counts only: addresses can say what someone reads. */
  readonly print: (line: string) => void;
}

async function readOrNull(run: BackfillRun, item: PostWithoutThumbnail): Promise<PostPicture | null> {
  try {
    return await run.readPicture(item);
  } catch (error) {
    run.print(`skipped ${item.id}: ${error instanceof Error ? error.name : 'error'}`);
    return null;
  }
}

/** The media trigger fires only when `image_url` changes, so the same address again would fetch nothing. */
function isNewPicture(item: PostWithoutThumbnail, picture: PostPicture | null): picture is PostPicture {
  return picture !== null && picture.imageUrl !== item.imageUrl;
}

/** #110's one-off: posts saved with no picture (video frames dropped, X's original size refused) get one now. Dry run unless `apply`. */
export async function runBackfill(run: BackfillRun): Promise<number> {
  const posts = await run.store.listPostsWithoutThumbnail();
  let found = 0;
  for (const item of posts) {
    const picture = await readOrNull(run, item);
    if (!isNewPicture(item, picture)) continue;
    found += 1;
    if (run.apply) await run.store.savePicture(picture);
  }
  const suffix = run.apply ? '' : ' (dry run: nothing changed)';
  run.print(`${posts.length} posts without a thumbnail: ${found} picture found, ${posts.length - found} without${suffix}`);
  return found;
}
