import { readMeta } from '../meta.ts';
import { isHtml } from '../text.ts';
import type { ContentSource, ExtractContext, Extracted } from '../types.ts';
import { fileNameFromUrl, hostLabel } from '../url.ts';

function bareCard(url: URL): Extracted {
  const label = hostLabel(url);
  return { kind: 'link', adapter: 'generic', url: url.toString(), title: label, siteName: label };
}

function fileCard(finalUrl: URL): Extracted {
  return { ...bareCard(finalUrl), title: fileNameFromUrl(finalUrl) };
}

async function fromPage(ctx: ExtractContext): Promise<Extracted> {
  const page = await ctx.page();
  if (!isHtml(page.contentType)) return fileCard(new URL(page.finalUrl));
  const meta = readMeta(page.body, page.finalUrl);
  const label = hostLabel(new URL(page.finalUrl));
  return {
    ...meta,
    kind: 'link',
    adapter: 'generic',
    url: page.finalUrl,
    title: meta.title ?? label,
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
      return bareCard(ctx.url);
    }
  },
};
