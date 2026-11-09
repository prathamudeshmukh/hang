const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|dclid|mc_eid|mc_cid|igshid|si)$/i;
const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com']);
const YOUTUBE_PATH_PREFIXES = ['/shorts/', '/embed/', '/live/'];

export function hostLabel(url: URL): string {
  return url.hostname.replace(/^www\./, '');
}

export function fileNameFromUrl(url: URL): string {
  const lastSegment = url.pathname.split('/').filter(Boolean).at(-1) ?? hostLabel(url);
  try {
    return decodeURIComponent(lastSegment);
  } catch {
    return lastSegment; // malformed escape (e.g. %E0): the raw segment is still a fine title
  }
}

export function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/** Returns a copy without tracking query params; never mutates the input. */
export function stripTracking(url: URL): URL {
  const cleaned = new URL(url.toString());
  const keep = [...url.searchParams.entries()].filter(([key]) => !TRACKING_PARAM.test(key));
  cleaned.search = new URLSearchParams(keep).toString();
  return cleaned;
}

function rawYouTubeId(url: URL): string | undefined {
  if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0];
  if (!YOUTUBE_HOSTS.has(url.hostname)) return undefined;
  if (url.pathname === '/watch') return url.searchParams.get('v') ?? undefined;
  const prefix = YOUTUBE_PATH_PREFIXES.find((p) => url.pathname.startsWith(p));
  return prefix ? url.pathname.slice(prefix.length).split('/')[0] : undefined;
}

export function youTubeVideoId(url: URL): string | undefined {
  const id = rawYouTubeId(url);
  return id && YOUTUBE_ID.test(id) ? id : undefined;
}
