import { videoOEmbedSchema } from '../schemas.ts';
import type { ContentSource, ExtractContext } from '../types.ts';
import { youTubeVideoId } from '../url.ts';

const OEMBED = 'https://www.youtube.com/oembed?format=json&url=';
const LENGTH_SECONDS = /"lengthSeconds":"(\d+)"/;

/** Duration is not in oEmbed; the watch page embeds it. Best effort only. */
async function readDuration(ctx: ExtractContext): Promise<number | undefined> {
  try {
    const page = await ctx.page();
    const match = LENGTH_SECONDS.exec(page.body);
    return match?.[1] ? Number(match[1]) : undefined;
  } catch {
    return undefined;
  }
}

export const youtube: ContentSource = {
  name: 'youtube',
  matches: (url) => youTubeVideoId(url) !== undefined,
  extract: async (ctx) => {
    const videoId = youTubeVideoId(ctx.url);
    if (!videoId) return null;
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const oembed = videoOEmbedSchema.parse(await ctx.fetchJson(`${OEMBED}${encodeURIComponent(watchUrl)}`));
    return {
      kind: 'video',
      adapter: 'youtube',
      url: watchUrl,
      title: oembed.title,
      author: oembed.author_name,
      siteName: 'YouTube',
      imageUrl: oembed.thumbnail_url,
      imageWidth: oembed.thumbnail_width,
      imageHeight: oembed.thumbnail_height,
      durationSeconds: await readDuration(ctx),
      embed: { provider: 'youtube', videoId, playableInline: true },
    };
  },
};
