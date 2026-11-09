/** Mirrors the server's check constraints (supabase/migrations), so bad input fails before it's queued. */
export const COLLECTION_NAME_MAX = 80;
export const SOURCE_URL_MAX = 4096;
export const SHARED_TITLE_MAX = 1000;
const HTTP_URL = /^https?:\/\//i;

export function validCollectionName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0 || trimmed.length > COLLECTION_NAME_MAX) {
    throw new Error(`Collection name must be 1–${COLLECTION_NAME_MAX} characters`);
  }
  return trimmed;
}

export function validSourceUrl(url: string): string {
  if (!HTTP_URL.test(url) || url.length > SOURCE_URL_MAX) {
    throw new Error(`Only http(s) links up to ${SOURCE_URL_MAX} characters can be saved`);
  }
  return url;
}

export function validSharedTitle(title: string | undefined): string | null {
  const trimmed = title?.trim();
  return trimmed ? trimmed.slice(0, SHARED_TITLE_MAX) : null;
}
