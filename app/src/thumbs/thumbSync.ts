import type { MissingThumb, ThumbStore } from './thumbStore.ts';

/** Where thumbnail files live on the device. */
export interface ThumbFilesPort {
  uriFor(itemId: string): string;
  /** Every file in the thumbnails folder. */
  list(): Promise<readonly string[]>;
  download(url: string, uri: string): Promise<void>;
  /** Idempotent: a missing file is fine. */
  remove(uri: string): Promise<void>;
}

/** Signed links for the private `media` bucket; a path it leaves out couldn't be signed. */
export interface ThumbSigner {
  sign(paths: readonly string[]): Promise<ReadonlyMap<string, string>>;
}

export interface ThumbSyncDeps {
  readonly store: ThumbStore;
  readonly files: ThumbFilesPort;
  readonly signer: ThumbSigner;
  /** Never given a URL: signed links carry a token and source links are private (SPEC §7). */
  readonly log: (message: string) => void;
}

export interface ThumbReport {
  readonly downloaded: number;
  readonly failed: number;
  readonly removed: number;
}

const CONCURRENCY = 3;
const SIGN_BATCH = 50;

const chunks = <T>(list: readonly T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

async function inPool<T>(tasks: readonly T[], worker: (task: T) => Promise<void>): Promise<void> {
  const queue = [...tasks];
  const lanes = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let task = queue.shift(); task !== undefined; task = queue.shift()) await worker(task);
  });
  await Promise.all(lanes);
}

/**
 * Keeps `thumbs/` in step with the items (SPEC §4, #27): drop files whose item is gone, then download the
 * missing ones. Each thumbnail is fetched once and never re-checked. Failures wait for the next run.
 */
export function createThumbSync({ store, files, signer, log }: ThumbSyncDeps) {
  async function reconcile(): Promise<number> {
    const stale = store.stale();
    store.forget(stale.map(({ itemId }) => itemId));
    const known = new Set(store.all().map(({ fileUri }) => fileUri));
    const strays = (await files.list()).filter((uri) => !known.has(uri));
    const doomed = [...stale.map(({ fileUri }) => fileUri), ...strays];
    await Promise.all(doomed.map((uri) => files.remove(uri)));
    return new Set(doomed).size;
  }

  async function downloadOne(thumb: MissingThumb, url: string | undefined): Promise<boolean> {
    if (!url) return false;
    const uri = files.uriFor(thumb.itemId);
    try {
      await files.download(url, uri);
      store.record(thumb.itemId, uri);
      return true;
    } catch (error) {
      log(`thumbnail for ${thumb.itemId} failed: ${error instanceof Error ? error.name : 'unknown'}`);
      await files.remove(uri).catch(() => undefined);
      return false;
    }
  }

  async function signed(batch: readonly MissingThumb[]): Promise<ReadonlyMap<string, string>> {
    try {
      return await signer.sign(batch.map(({ thumbPath }) => thumbPath));
    } catch (error) {
      log(`signing ${batch.length} thumbnails failed: ${error instanceof Error ? error.name : 'unknown'}`);
      return new Map();
    }
  }

  async function download(): Promise<number> {
    let downloaded = 0;
    for (const batch of chunks(store.missing(), SIGN_BATCH)) {
      const urls = await signed(batch);
      await inPool(batch, async (thumb) => {
        if (await downloadOne(thumb, urls.get(thumb.thumbPath))) downloaded += 1;
      });
    }
    return downloaded;
  }

  async function pass(): Promise<ThumbReport> {
    const removed = await reconcile();
    const before = store.missing().length;
    const downloaded = await download();
    return { downloaded, failed: before - downloaded, removed };
  }

  let running: Promise<ThumbReport> | null = null;
  let followUp: Promise<ThumbReport> | null = null;

  function run(): Promise<ThumbReport> {
    if (!running) {
      running = pass().finally(() => {
        running = null;
      });
      return running;
    }
    followUp ??= running.catch(() => undefined).then(() => {
      followUp = null;
      return run();
    });
    return followUp;
  }

  return { run, reconcile };
}

export type ThumbSync = ReturnType<typeof createThumbSync>;
