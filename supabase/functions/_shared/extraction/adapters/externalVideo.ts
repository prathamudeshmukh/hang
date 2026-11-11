import { readMeta } from '../meta.ts';
import { videoOEmbedSchema } from '../schemas.ts';
import type { ContentSource, ExtractContext, Extracted } from '../types.ts';

/** Platforms whose video can't play inline in v1; the card opens the platform app. */
const PLATFORMS = [
  { provider: 'tiktok', siteName: 'TikTok', hosts: ['tiktok.com', 'www.tiktok.com', 'm.tiktok.com'], path: /\/video\/\d+/ },
  { provider: 'instagram', siteName: 'Instagram', hosts: ['instagram.com', 'www.instagram.com'], path: /^\/(reel|reels|tv)\// },
] as const;

const TIKTOK_OEMBED = 'https://www.tiktok.com/oembed?url=';

type Platform = (typeof PLATFORMS)[number];

function platformFor(url: URL): Platform | undefined {
  return PLATFORMS.find((p) => (p.hosts as readonly string[]).includes(url.hostname) && p.path.test(url.pathname));
}

async function fromTikTokOEmbed(ctx: ExtractContext): Promise<Partial<Extracted>> {
  const oembed = videoOEmbedSchema.parse(await ctx.fetchJson(`${TIKTOK_OEMBED}${encodeURIComponent(ctx.url.toString())}`));
  return { title: oembed.title, author: oembed.author_name, imageUrl: oembed.thumbnail_url };
}

async function fromOpenGraph(ctx: ExtractContext): Promise<Partial<Extracted>> {
  const page = await ctx.page();
  const meta = readMeta(page.body, page.finalUrl);
  return { title: meta.title, author: meta.author, imageUrl: meta.imageUrl, description: meta.description };
}

/**
 * Platforms block bots inconsistently, so each source is best effort. A failed source is
 * expected, not exceptional: the card is still a video that opens the platform app.
 */
async function bestEffortDetails(ctx: ExtractContext, platform: Platform): Promise<Partial<Extracted>> {
  const sources = platform.provider === 'tiktok' ? [fromTikTokOEmbed, fromOpenGraph] : [fromOpenGraph];
  for (const source of sources) {
    try {
      return await source(ctx);
    } catch {
      continue;
    }
  }
  return {};
}

export const externalVideo: ContentSource = {
  name: 'externalVideo',
  matches: (url) => platformFor(url) !== undefined,
  extract: async (ctx) => {
    const platform = platformFor(ctx.url);
    if (!platform) return null;
    const details = await bestEffortDetails(ctx, platform);
    return {
      ...details,
      kind: 'video',
      adapter: 'externalVideo',
      url: ctx.url.toString(),
      title: details.title ?? platform.siteName,
      siteName: platform.siteName,
      embed: { provider: platform.provider, playableInline: false },
    };
  },
};
