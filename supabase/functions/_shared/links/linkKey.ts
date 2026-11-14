/**
 * "The same link" (#19), shared by the app (share sheet), the extract function and the duplicate clean-up script.
 * Plain string parsing on purpose: React Native's URL is a loose regex wrapper, and every runtime must agree.
 */

/** Query parameters that only say where a click came from. */
export const TRACKING_PARAM = /^(utm_[a-z]+|fbclid|gclid|dclid|mc_eid|mc_cid|igshid|si)$/i;

const WEB_URL = /^https?:\/\/(?:[^@/?#]*@)?([^:/?#]+)(:\d+)?([^?#]*)(?:\?([^#]*))?/i;
const HOST_PREFIX = /^(www|m|mobile)\./;
const TRAILING_SLASHES = /\/+$/;
const YOUTUBE_ID = /^[\w-]{11}$/;
const YOUTUBE_HOSTS = new Set(['youtube.com', 'music.youtube.com']);
const YOUTUBE_PATH = /^\/(?:shorts|embed|live)\/([^/]+)/;

interface LinkParts {
  readonly host: string;
  readonly path: string;
  readonly params: readonly string[];
}

const keyOf = (param: string) => param.split('=')[0] ?? '';

function partsOf(url: string): LinkParts | null {
  const match = WEB_URL.exec(url.trim());
  if (!match) return null;
  const [, host = '', port = '', path = '', query = ''] = match;
  const params = query.split('&').filter((param) => param !== '' && !TRACKING_PARAM.test(keyOf(param)));
  return { host: host.toLowerCase().replace(HOST_PREFIX, '') + port, path: path.replace(TRAILING_SLASHES, ''), params };
}

function youTubeCandidate({ host, path, params }: LinkParts): string | undefined {
  if (host === 'youtu.be') return path.slice(1).split('/')[0];
  if (!YOUTUBE_HOSTS.has(host)) return undefined;
  if (path === '/watch') return params.find((param) => keyOf(param) === 'v')?.slice('v='.length);
  return YOUTUBE_PATH.exec(path)?.[1];
}

function youTubeId(parts: LinkParts): string | null {
  const candidate = youTubeCandidate(parts);
  return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
}

/** A comparison key for a web link, or null when it isn't one. Two links with the same key are the same thing. */
export function linkKey(url: string): string | null {
  const parts = partsOf(url);
  if (!parts) return null;
  const video = youTubeId(parts);
  if (video) return `youtube:${video}`;
  const query = [...parts.params].sort().join('&');
  return `${parts.host}${parts.path}${query ? `?${query}` : ''}`;
}
