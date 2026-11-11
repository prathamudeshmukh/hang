import { article } from './adapters/article.ts';
import { directImage } from './adapters/directImage.ts';
import { directVideo } from './adapters/directVideo.ts';
import { externalVideo } from './adapters/externalVideo.ts';
import { generic } from './adapters/generic.ts';
import { imagePage } from './adapters/imagePage.ts';
import { vimeo } from './adapters/vimeo.ts';
import { xPost } from './adapters/xPost.ts';
import { youtube } from './adapters/youtube.ts';
import type { ContentSource, ExtractContext, Extracted } from './types.ts';

/** Order matters: URL-specific adapters first, content sniffers next, generic last. */
export const ADAPTERS: readonly ContentSource[] = [
  youtube,
  vimeo,
  xPost,
  externalVideo,
  directVideo,
  imagePage,
  directImage,
  article,
  generic,
];

export interface AdapterError {
  readonly adapter: string;
  readonly message: string;
}

export interface ExtractionResult {
  readonly extracted: Extracted;
  readonly errors: readonly AdapterError[];
}

function toMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function extract(ctx: ExtractContext, adapters: readonly ContentSource[] = ADAPTERS): Promise<ExtractionResult> {
  let errors: readonly AdapterError[] = [];
  for (const adapter of adapters.filter((a) => a.matches(ctx.url))) {
    try {
      const extracted = await adapter.extract(ctx);
      if (extracted) return { extracted, errors };
    } catch (error) {
      errors = [...errors, { adapter: adapter.name, message: toMessage(error) }];
    }
  }
  const fallback = await generic.extract(ctx);
  return { extracted: fallback ?? { kind: 'link', adapter: 'generic', url: ctx.url.toString() }, errors };
}
