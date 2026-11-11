import { videoOEmbedSchema } from '../schemas.ts';
import type { ContentSource } from '../types.ts';

const OEMBED = 'https://vimeo.com/api/oembed.json?url=';
const VIMEO_HOSTS = new Set(['vimeo.com', 'www.vimeo.com', 'player.vimeo.com']);
const VIDEO_ID = /\/(\d{5,})(?:\/|$)/;

function vimeoId(url: URL): string | undefined {
  return VIMEO_HOSTS.has(url.hostname) ? VIDEO_ID.exec(url.pathname)?.[1] : undefined;
}

export const vimeo: ContentSource = {
  name: 'vimeo',
  matches: (url) => vimeoId(url) !== undefined,
  extract: async (ctx) => {
    const oembed = videoOEmbedSchema.parse(await ctx.fetchJson(`${OEMBED}${encodeURIComponent(ctx.url.toString())}`));
    const videoId = String(oembed.video_id ?? vimeoId(ctx.url));
    return {
      kind: 'video',
      adapter: 'vimeo',
      url: ctx.url.toString(),
      title: oembed.title,
      author: oembed.author_name,
      siteName: 'Vimeo',
      imageUrl: oembed.thumbnail_url,
      imageWidth: oembed.thumbnail_width,
      imageHeight: oembed.thumbnail_height,
      durationSeconds: oembed.duration,
      embed: { provider: 'vimeo', videoId, playableInline: true },
    };
  },
};
