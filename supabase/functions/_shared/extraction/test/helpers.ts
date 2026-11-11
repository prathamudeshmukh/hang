import type { ExtractContext, FetchedPage } from '../types.ts';

export function fixture(name: string): string {
  return Deno.readTextFileSync(new URL(`./fixtures/${name}`, import.meta.url));
}

export function htmlPage(body: string, finalUrl = 'https://example.com/page'): FetchedPage {
  return { finalUrl, status: 200, contentType: 'text/html; charset=utf-8', body };
}

interface ContextStubs {
  readonly page?: FetchedPage | Error;
  readonly json?: Record<string, unknown>;
  readonly sharedTitle?: string;
}

/** Builds an ExtractContext with canned responses; unknown JSON URLs reject. */
export function makeContext(url: string, stubs: ContextStubs = {}): ExtractContext {
  return {
    url: new URL(url),
    sharedTitle: stubs.sharedTitle,
    page: () => {
      if (stubs.page instanceof Error) return Promise.reject(stubs.page);
      return stubs.page ? Promise.resolve(stubs.page) : Promise.reject(new Error('no page stub'));
    },
    fetchJson: (requested: string) => {
      const key = Object.keys(stubs.json ?? {}).find((prefix) => requested.startsWith(prefix));
      if (!key) return Promise.reject(new Error(`unexpected fetchJson: ${requested}`));
      const value = stubs.json?.[key];
      return value instanceof Error ? Promise.reject(value) : Promise.resolve(value);
    },
  };
}
