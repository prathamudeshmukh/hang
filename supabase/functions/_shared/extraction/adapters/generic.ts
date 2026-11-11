import { readMeta } from '../meta.ts';
import { isHtml } from '../text.ts';
import type { ContentSource, ExtractContext, Extracted } from '../types.ts';
import { fileNameFromUrl, hostLabel } from '../url.ts';

/** The share's own title beats a hostname or file name when the page itself gave us nothing. */
function bareCard(url: URL, sharedTitle: string | undefined): Extracted {
  const label = hostLabel(url);
  return { kind: 'link', adapter: 'generic', url: url.toString(), title: sharedTitle ?? label, siteName: label };
}

function fileCard(finalUrl: URL, sharedTitle: string | undefined): Extracted {
  return { ...bareCard(finalUrl, sharedTitle), title: sharedTitle ?? fileNameFromUrl(finalUrl) };
}

async function fromPage(ctx: ExtractContext): Promise<Extracted> {
  const page = await ctx.page();
  if (!isHtml(page.contentType)) return fileCard(new URL(page.finalUrl), ctx.sharedTitle);
  const meta = readMeta(page.body, page.finalUrl);
  const label = hostLabel(new URL(page.finalUrl));
  return {
    ...meta,
    kind: 'link',
    adapter: 'generic',
    url: page.finalUrl,
    title: meta.title ?? ctx.sharedTitle ?? label,
    siteName: meta.siteName ?? label,
  };
}

/** Last resort: always produces a card, even when the page can't be fetched. */
export const generic: ContentSource = {
  name: 'generic',
  matches: () => true,
  extract: async (ctx) => {
    try {
      return await fromPage(ctx);
    } catch {
      return bareCard(ctx.url, ctx.sharedTitle);
    }
  },
};
