import { parseHTML } from 'linkedom';
import type { z } from 'zod';
import { postMirrorSchema, postOEmbedSchema } from '../schemas.ts';
import { truncate } from '../text.ts';
import type { ContentSource, ExtractContext, Extracted, PostSnapshot } from '../types.ts';

const POST_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);
const STATUS_PATH = /^\/(\w{1,15})\/status\/(\d+)/;
const MIRROR = 'https://api.fxtwitter.com';
const OEMBED = 'https://publish.twitter.com/oembed?omit_script=true&url=';
const TITLE_MAX = 90;
const PHOTO_HOST = 'pbs.twimg.com';
/** X's `large` cut is at most 2048px a side, inside the thumbnail step's pixel cap; `orig` can be 12MP and gets dropped (#69). */
const PHOTO_SIZE = 'large';

interface StatusRef { readonly user: string; readonly id: string }

function statusRef(url: URL): StatusRef | undefined {
  if (!POST_HOSTS.has(url.hostname)) return undefined;
  const match = STATUS_PATH.exec(url.pathname);
  return match?.[1] && match[2] ? { user: match[1], id: match[2] } : undefined;
}

function sizedPhoto(address: string): string {
  const url = new URL(address);
  if (url.hostname !== PHOTO_HOST) return address;
  url.searchParams.set('name', PHOTO_SIZE);
  return url.toString();
}

const isPresent = (url: string | undefined): url is string => url !== undefined;

type MirrorMedia = z.infer<typeof postMirrorSchema>['tweet']['media'];

/** Photos at X's large size, then each video's or GIF's frame (#110): a post's picture is whatever it showed. */
function pictureUrls(media: MirrorMedia): string[] {
  const photos = (media?.photos ?? []).map((photo) => photo.url).filter(isPresent).map(sizedPhoto);
  const frames = (media?.videos ?? []).map((video) => video.thumbnail_url).filter(isPresent);
  return [...photos, ...frames];
}

async function fromMirror(ctx: ExtractContext, ref: StatusRef): Promise<PostSnapshot> {
  const { tweet } = postMirrorSchema.parse(await ctx.fetchJson(`${MIRROR}/${ref.user}/status/${ref.id}`));
  return {
    authorName: tweet.author.name,
    handle: tweet.author.screen_name,
    avatarUrl: tweet.author.avatar_url,
    text: tweet.text,
    mediaUrls: pictureUrls(tweet.media),
    postedAt: tweet.created_at,
  };
}

async function fromOEmbed(ctx: ExtractContext, ref: StatusRef): Promise<PostSnapshot> {
  const canonical = `https://twitter.com/${ref.user}/status/${ref.id}`;
  const oembed = postOEmbedSchema.parse(await ctx.fetchJson(`${OEMBED}${encodeURIComponent(canonical)}`));
  const { document } = parseHTML(oembed.html);
  const text = document.querySelector('p')?.textContent?.trim() ?? '';
  return { authorName: oembed.author_name, handle: ref.user, text, mediaUrls: [] };
}

async function snapshot(ctx: ExtractContext, ref: StatusRef): Promise<PostSnapshot> {
  try {
    return await fromMirror(ctx, ref);
  } catch (mirrorError) {
    try {
      return await fromOEmbed(ctx, ref);
    } catch {
      throw new Error(`post unavailable (mirror: ${String(mirrorError)})`);
    }
  }
}

function toExtracted(url: URL, post: PostSnapshot): Extracted {
  return {
    kind: 'post',
    adapter: 'xPost',
    url: url.toString(),
    title: truncate(post.text, TITLE_MAX),
    author: post.authorName,
    siteName: 'X',
    imageUrl: post.mediaUrls[0],
    post,
  };
}

export const xPost: ContentSource = {
  name: 'xPost',
  matches: (url) => statusRef(url) !== undefined,
  extract: async (ctx) => {
    const ref = statusRef(ctx.url);
    return ref ? toExtracted(ctx.url, await snapshot(ctx, ref)) : null;
  },
};
