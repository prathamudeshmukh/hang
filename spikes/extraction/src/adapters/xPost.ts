import { parseHTML } from 'linkedom';
import { postMirrorSchema, postOEmbedSchema } from '../schemas.ts';
import { truncate } from '../text.ts';
import type { ContentSource, ExtractContext, Extracted, PostSnapshot } from '../types.ts';

const POST_HOSTS = new Set(['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com', 'mobile.twitter.com']);
const STATUS_PATH = /^\/(\w{1,15})\/status\/(\d+)/;
const MIRROR = 'https://api.fxtwitter.com';
const OEMBED = 'https://publish.twitter.com/oembed?omit_script=true&url=';
const TITLE_MAX = 90;

interface StatusRef { readonly user: string; readonly id: string }

function statusRef(url: URL): StatusRef | undefined {
  if (!POST_HOSTS.has(url.hostname)) return undefined;
  const match = STATUS_PATH.exec(url.pathname);
  return match?.[1] && match[2] ? { user: match[1], id: match[2] } : undefined;
}

async function fromMirror(ctx: ExtractContext, ref: StatusRef): Promise<PostSnapshot> {
  const { tweet } = postMirrorSchema.parse(await ctx.fetchJson(`${MIRROR}/${ref.user}/status/${ref.id}`));
  return {
    authorName: tweet.author.name,
    handle: tweet.author.screen_name,
    avatarUrl: tweet.author.avatar_url,
    text: tweet.text,
    mediaUrls: (tweet.media?.photos ?? []).map((photo) => photo.url).filter((u): u is string => u !== undefined),
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
