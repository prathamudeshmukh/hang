import type { Embed, Extracted, PostSnapshot } from '../_shared/extraction/types.ts';
import { hostLabel, stripTracking } from '../_shared/extraction/url.ts';
import type { ClaimedItem, EmbedJson, ItemPatch, PostJson } from './types.ts';

const MAX_TITLE_LENGTH = 500;
const MAX_TEXT_LENGTH = 1000;
const MAX_URL_LENGTH = 4096;
const WEB_PROTOCOLS = new Set(['http:', 'https:']);

function clean(value: string | undefined | null, maxLength = MAX_TEXT_LENGTH): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function wholeNumber(value: number | undefined): number | null {
  return value === undefined || !Number.isFinite(value) ? null : Math.round(value);
}

function toIsoDate(value: string | undefined): string | null {
  const time = value ? Date.parse(value) : Number.NaN;
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

function toEmbedJson(embed: Embed | undefined): EmbedJson | null {
  if (!embed) return null;
  return { provider: embed.provider, video_id: embed.videoId ?? null, playable_inline: embed.playableInline };
}

function toPostJson(post: PostSnapshot | undefined): PostJson | null {
  if (!post) return null;
  return {
    author: post.authorName,
    handle: post.handle,
    avatar: post.avatarUrl ?? null,
    text: post.text,
    media: post.mediaUrls,
    posted_at: toIsoDate(post.postedAt),
  };
}

/** An absolute http(s) address the DB check accepts, or null. Relative ones resolve against the page. */
function webUrl(value: string | undefined, base: string): string | null {
  if (!value) return null;
  try {
    const url = new URL(value, base);
    const href = url.toString();
    return WEB_PROTOCOLS.has(url.protocol) && href.length <= MAX_URL_LENGTH ? href : null;
  } catch {
    return null;
  }
}

function leadImage(extracted: Extracted): string | null {
  return webUrl(extracted.imageUrl, extracted.url) ?? webUrl(extracted.post?.mediaUrls[0], extracted.url);
}

/** Maps a registry result onto the item's derived columns (SPEC §5). */
export function toItemPatch(item: ClaimedItem, extracted: Extracted): ItemPatch {
  const canonical = stripTracking(new URL(extracted.url));
  const rawTitle = clean(extracted.title, MAX_TITLE_LENGTH);
  return {
    status: 'ready',
    extract_error: null,
    kind: extracted.kind,
    adapter: extracted.adapter,
    canonical_url: canonical.toString(),
    title: rawTitle ?? clean(item.sharedTitle, MAX_TITLE_LENGTH) ?? hostLabel(canonical),
    raw_title: rawTitle,
    site_name: clean(extracted.siteName) ?? hostLabel(canonical),
    author: clean(extracted.author),
    duration_s: wholeNumber(extracted.durationSeconds),
    reading_min: wholeNumber(extracted.readingMinutes),
    image_url: leadImage(extracted),
    embed: toEmbedJson(extracted.embed),
    post: toPostJson(extracted.post),
  };
}
