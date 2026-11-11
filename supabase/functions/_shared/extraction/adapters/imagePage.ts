import { readMeta } from '../meta.ts';
import type { ContentSource } from '../types.ts';
import { hostLabel } from '../url.ts';

/** Sites where the page *is* a picture; the og:image is the thing being saved. */
const IMAGE_HOSTS = /(^|\.)(pinterest\.[a-z.]+|pin\.it|dribbble\.com|behance\.net|unsplash\.com|flickr\.com|deviantart\.com|artstation\.com)$/i;
const INSTAGRAM_POST = /^\/p\//;

function isImageHost(url: URL): boolean {
  const isInstagramPost = hostLabel(url) === 'instagram.com' && INSTAGRAM_POST.test(url.pathname);
  return IMAGE_HOSTS.test(url.hostname) || isInstagramPost;
}

export const imagePage: ContentSource = {
  name: 'imagePage',
  matches: isImageHost,
  extract: async (ctx) => {
    const page = await ctx.page();
    const meta = readMeta(page.body, page.finalUrl);
    if (!meta.imageUrl) return null;
    return {
      kind: 'image',
      adapter: 'imagePage',
      url: page.finalUrl,
      title: meta.title,
      siteName: meta.siteName ?? hostLabel(ctx.url),
      author: meta.author,
      description: meta.description,
      imageUrl: meta.imageUrl,
      imageWidth: meta.imageWidth,
      imageHeight: meta.imageHeight,
    };
  },
};
