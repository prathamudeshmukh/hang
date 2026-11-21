import { useWindowDimensions } from 'react-native';
import { mediaFit, type MediaFit } from '@/hero/geometry';
import type { FeedMedia } from './feedPage';

const COVER: MediaFit = { fit: 'cover' };

/** How a page's picture sits in its media box (#95). The feed fills the window edge to edge, as the hero assumes. */
export function usePictureFit(media: FeedMedia, mediaHeight: number): MediaFit {
  const { width } = useWindowDimensions();
  if (media.kind !== 'picture' || !media.media.uri) return COVER;
  return mediaFit({ x: 0, y: 0, width, height: mediaHeight }, media.media.naturalRatio);
}
