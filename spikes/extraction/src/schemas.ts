import { z } from 'zod';
import { isHttpUrl } from './url.ts';

/** URLs from third parties become fetch targets and <img> sources: keep only http(s), drop the rest. */
const httpUrl = z.string().transform((value) => (isHttpUrl(value) ? value : undefined));

/** Shared shape of YouTube, Vimeo and TikTok oEmbed responses (fields we use). */
export const videoOEmbedSchema = z.object({
  title: z.string(),
  author_name: z.string().optional(),
  thumbnail_url: httpUrl.optional(),
  thumbnail_width: z.number().optional(),
  thumbnail_height: z.number().optional(),
  duration: z.number().optional(),
  video_id: z.number().optional(),
});

/** fxtwitter-style mirror: https://api.fxtwitter.com/{user}/status/{id} */
export const postMirrorSchema = z.object({
  tweet: z.object({
    text: z.string(),
    created_at: z.string().optional(),
    author: z.object({
      name: z.string(),
      screen_name: z.string(),
      avatar_url: httpUrl.optional(),
    }),
    media: z
      .object({ photos: z.array(z.object({ url: httpUrl })).optional() })
      .optional(),
  }),
});

export const postOEmbedSchema = z.object({
  author_name: z.string(),
  html: z.string(),
});
