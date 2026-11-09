import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import type { ExtractContext, FetchedPage } from '../src/types.ts';

export function fixture(name: string): string {
  return readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), 'utf8');
}

export function htmlPage(body: string, finalUrl = 'https://example.com/page'): FetchedPage {
  return { finalUrl, status: 200, contentType: 'text/html; charset=utf-8', body };
}

interface ContextStubs {
  readonly page?: FetchedPage | Error;
  readonly json?: Record<string, unknown>;
}

/** Builds an ExtractContext with canned responses; unknown JSON URLs reject. */
export function makeContext(url: string, stubs: ContextStubs = {}): ExtractContext {
  return {
    url: new URL(url),
    page: async () => {
      if (stubs.page instanceof Error) throw stubs.page;
      if (!stubs.page) throw new Error('no page stub');
      return stubs.page;
    },
    fetchJson: async (requested: string) => {
      const key = Object.keys(stubs.json ?? {}).find((prefix) => requested.startsWith(prefix));
      if (!key) throw new Error(`unexpected fetchJson: ${requested}`);
      const value = stubs.json?.[key];
      if (value instanceof Error) throw value;
      return value;
    },
  };
}
