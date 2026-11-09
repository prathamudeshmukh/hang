export const CARD_KINDS = ['article', 'video', 'post', 'image', 'link'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export interface PostSnapshot {
  readonly authorName: string;
  readonly handle: string;
  readonly avatarUrl?: string;
  readonly text: string;
  readonly mediaUrls: readonly string[];
  readonly postedAt?: string;
}

export interface Embed {
  readonly provider: string;
  readonly videoId?: string;
  readonly playableInline: boolean;
}

export interface Extracted {
  readonly kind: CardKind;
  readonly adapter: string;
  readonly url: string;
  readonly title?: string;
  readonly siteName?: string;
  readonly author?: string;
  readonly imageUrl?: string;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
  readonly description?: string;
  readonly durationSeconds?: number;
  readonly readingMinutes?: number;
  readonly contentHtml?: string;
  readonly contentText?: string;
  readonly post?: PostSnapshot;
  readonly embed?: Embed;
}

export interface FetchedPage {
  readonly finalUrl: string;
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
}

/** Everything an adapter may need, injected so adapters stay pure and testable. */
export interface ExtractContext {
  readonly url: URL;
  readonly fetchJson: (url: string) => Promise<unknown>;
  /** Fetches the shared URL once; memoised across adapters. */
  readonly page: () => Promise<FetchedPage>;
}

export interface ContentSource {
  readonly name: string;
  readonly matches: (url: URL) => boolean;
  /** Returns null to decline and let the next adapter try. */
  readonly extract: (ctx: ExtractContext) => Promise<Extracted | null>;
}
