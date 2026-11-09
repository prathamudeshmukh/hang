import { parseHTML } from 'linkedom';
import { isHttpUrl } from './url.ts';

export interface PageMeta {
  readonly title?: string;
  readonly siteName?: string;
  readonly author?: string;
  readonly description?: string;
  readonly imageUrl?: string;
  readonly imageWidth?: number;
  readonly imageHeight?: number;
}

const KEYS = {
  title: ['og:title', 'twitter:title'],
  siteName: ['og:site_name', 'application-name'],
  author: ['author', 'article:author', 'twitter:creator'],
  description: ['og:description', 'twitter:description', 'description'],
  image: ['og:image:secure_url', 'og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'],
  imageWidth: ['og:image:width'],
  imageHeight: ['og:image:height'],
} as const;

type MetaDocument = ReturnType<typeof parseHTML>['document'];

function metaContent(doc: MetaDocument, keys: readonly string[]): string | undefined {
  const values = keys.map((key) => doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)?.getAttribute('content')?.trim());
  return values.find((value): value is string => Boolean(value));
}

export function resolveHttpUrl(value: string | undefined, baseUrl: string): string | undefined {
  if (!value) return undefined;
  try {
    const resolved = new URL(value, baseUrl).toString();
    return isHttpUrl(resolved) ? resolved : undefined;
  } catch {
    return undefined;
  }
}

function toNumber(value: string | undefined): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

export function readMeta(html: string, baseUrl: string): PageMeta {
  const { document } = parseHTML(html);
  const titleTag = document.querySelector('title')?.textContent?.trim() || undefined;
  return {
    title: metaContent(document, KEYS.title) ?? titleTag,
    siteName: metaContent(document, KEYS.siteName),
    author: metaContent(document, KEYS.author),
    description: metaContent(document, KEYS.description),
    imageUrl: resolveHttpUrl(metaContent(document, KEYS.image), baseUrl),
    imageWidth: toNumber(metaContent(document, KEYS.imageWidth)),
    imageHeight: toNumber(metaContent(document, KEYS.imageHeight)),
  };
}
