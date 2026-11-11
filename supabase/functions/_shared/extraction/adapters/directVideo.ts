import type { ContentSource } from '../types.ts';
import { fileNameFromUrl, hostLabel } from '../url.ts';

const VIDEO_FILE = /\.(mp4|m4v|webm|mov|m3u8)$/i;

export const directVideo: ContentSource = {
  name: 'directVideo',
  matches: (url) => VIDEO_FILE.test(url.pathname),
  extract: (ctx) => Promise.resolve({
    kind: 'video',
    adapter: 'directVideo',
    url: ctx.url.toString(),
    title: fileNameFromUrl(ctx.url),
    siteName: hostLabel(ctx.url),
    embed: { provider: 'file', playableInline: true },
  }),
};
