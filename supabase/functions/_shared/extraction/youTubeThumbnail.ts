/**
 * #107: oEmbed's `hqdefault` is 4:3 with the 16:9 frame letterboxed inside, so ask for a 16:9 picture instead.
 * `maxresdefault` is missing on some older or low-resolution uploads; `mqdefault` is always there.
 */
export interface YouTubeThumbnail {
  readonly url: string;
  readonly width: number;
  readonly height: number;
}

const ytimg = (videoId: string, name: string) => `https://i.ytimg.com/vi/${videoId}/${name}.jpg`;
const LARGE = { name: 'maxresdefault', width: 1280, height: 720 } as const;
const MEDIUM = { name: 'mqdefault', width: 320, height: 180 } as const;

async function existsOrNo(imageExists: (url: string) => Promise<boolean>, url: string): Promise<boolean> {
  try {
    return await imageExists(url);
  } catch {
    return false;
  }
}

export async function youTubeThumbnail(
  videoId: string,
  imageExists: (url: string) => Promise<boolean>,
): Promise<YouTubeThumbnail> {
  const large = ytimg(videoId, LARGE.name);
  if (await existsOrNo(imageExists, large)) return { url: large, width: LARGE.width, height: LARGE.height };
  return { url: ytimg(videoId, MEDIUM.name), width: MEDIUM.width, height: MEDIUM.height };
}
