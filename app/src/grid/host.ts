const LEADING_WWW = /^www\./;

/** The host as people say it: no scheme, no path, no `www.`. Not a URL? The text as given. */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(LEADING_WWW, '');
  } catch {
    return url;
  }
}
