import type { ContentSource } from '../types.ts';
import { fileNameFromUrl, hostLabel } from '../url.ts';

export const directImage: ContentSource = {
  name: 'directImage',
  matches: () => true,
  extract: async (ctx) => {
    const page = await ctx.page();
    if (!page.contentType.toLowerCase().startsWith('image/')) return null;
    const finalUrl = new URL(page.finalUrl);
    return {
      kind: 'image',
      adapter: 'directImage',
      url: page.finalUrl,
      title: fileNameFromUrl(finalUrl),
      siteName: hostLabel(finalUrl),
      imageUrl: page.finalUrl,
    };
  },
};
