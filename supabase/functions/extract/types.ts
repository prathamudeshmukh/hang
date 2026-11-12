import type { ExtractionResult } from '../_shared/extraction/registry.ts';
import type { CardKind } from '../_shared/extraction/types.ts';

/** The row as the function sees it after claiming it (status moved pending → extracting). */
export interface ClaimedItem {
  readonly id: string;
  readonly sourceUrl: string;
  readonly sharedTitle: string | null;
}

/** SPEC §5 `embed` and `post` jsonb shapes. */
export interface EmbedJson {
  readonly provider: string;
  readonly video_id: string | null;
  readonly playable_inline: boolean;
}

export interface PostJson {
  readonly author: string;
  readonly handle: string;
  readonly avatar: string | null;
  readonly text: string;
  readonly media: readonly string[];
  readonly posted_at: string | null;
}

/** Derived fields only; user fields (collection_id, read_at, progress, shared_title) are never written. */
export interface ItemPatch {
  readonly status: 'ready';
  readonly extract_error: null;
  readonly kind: CardKind;
  readonly adapter: string;
  readonly canonical_url: string;
  readonly title: string;
  readonly raw_title: string | null;
  readonly site_name: string | null;
  readonly author: string | null;
  readonly duration_s: number | null;
  readonly reading_min: number | null;
  /** Lead image to thumbnail; setting it triggers the `media` function. */
  readonly image_url: string | null;
  readonly embed: EmbedJson | null;
  readonly post: PostJson | null;
}

/** Short codes only: never a URL or a stack trace (SPEC §7). */
export type ExtractErrorCode = 'internal';

export interface ItemStore {
  /** Atomically moves a live `pending` row to `extracting`; null if there's nothing to do. */
  readonly claim: (id: string) => Promise<ClaimedItem | null>;
  readonly complete: (id: string, patch: ItemPatch) => Promise<void>;
  readonly fail: (id: string, code: ExtractErrorCode) => Promise<void>;
}

export type ExtractItem = (item: ClaimedItem) => Promise<ExtractionResult>;

export type { LogFields, Logger } from '../_shared/edge/logger.ts';
