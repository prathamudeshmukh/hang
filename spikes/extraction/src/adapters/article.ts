import { Readability } from '@mozilla/readability';
import { parseHTML } from 'linkedom';
import { readMeta, resolveHttpUrl } from '../meta.ts';
import { isHtml, readingMinutes } from '../text.ts';
import type { ContentSource } from '../types.ts';
import { hostLabel } from '../url.ts';

/** Below this, a page is a landing page or a stub, not something to read. */
const MIN_ARTICLE_CHARS = 1000;
/** Above this share of text inside links, the page is a list of links (an index, a feed). */
const MAX_LINK_DENSITY = 0.5;
const HAS_BODY = /<body[\s>]/i;

type ParsedArticle = NonNullable<ReturnType<Readability['parse']>>;

/** linkedom returns a body-less document for tag-soup pages; Readability needs a body. */
function parseDocument(html: string): Document {
  const wrapped = HAS_BODY.test(html) ? html : `<!doctype html><html><head></head><body>${html}</body></html>`;
  // linkedom's Document is DOM-compatible enough for Readability at runtime.
  return parseHTML(wrapped).document as unknown as Document;
}

function linkDensity(contentHtml: string): number {
  const doc = parseDocument(contentHtml);
  const total = doc.body.textContent?.length ?? 0;
  const linked = [...doc.querySelectorAll('a')].reduce((sum, a) => sum + (a.textContent?.length ?? 0), 0);
  return total === 0 ? 1 : linked / total;
}

function firstContentImage(contentHtml: string, baseUrl: string): string | undefined {
  const src = parseDocument(contentHtml).querySelector('img[src]')?.getAttribute('src') ?? undefined;
  return resolveHttpUrl(src, baseUrl);
}

function readableArticle(html: string): ParsedArticle | undefined {
  const parsed = new Readability(parseDocument(html)).parse();
  const text = parsed?.textContent?.trim() ?? '';
  if (!parsed?.content || text.length < MIN_ARTICLE_CHARS) return undefined;
  return linkDensity(parsed.content) > MAX_LINK_DENSITY ? undefined : parsed;
}

export const article: ContentSource = {
  name: 'article',
  matches: () => true,
  extract: async (ctx) => {
    const page = await ctx.page();
    if (!isHtml(page.contentType)) return null;
    const parsed = readableArticle(page.body);
    if (!parsed?.content) return null;
    const meta = readMeta(page.body, page.finalUrl);
    const text = parsed.textContent?.trim() ?? '';
    return {
      kind: 'article',
      adapter: 'article',
      url: page.finalUrl,
      title: meta.title ?? parsed.title ?? hostLabel(ctx.url),
      siteName: meta.siteName ?? parsed.siteName ?? hostLabel(new URL(page.finalUrl)),
      author: meta.author ?? parsed.byline ?? undefined,
      description: meta.description ?? parsed.excerpt ?? undefined,
      imageUrl: meta.imageUrl ?? firstContentImage(parsed.content, page.finalUrl),
      imageWidth: meta.imageWidth,
      imageHeight: meta.imageHeight,
      readingMinutes: readingMinutes(text),
      contentHtml: parsed.content,
      contentText: text,
    };
  },
};
