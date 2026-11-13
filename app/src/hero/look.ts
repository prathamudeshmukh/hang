import { feedMediaOf } from '../feed/feedPage.ts';
import type { CardModel } from '../grid/cardModel.ts';
import type { Landing } from './geometry.ts';

/** What flies: the thumbnail itself, or an empty `raised` print for faces made of text (#32 decision 2). */
export type Look = { readonly kind: 'picture'; readonly uri: string; readonly landing: Landing } | { readonly kind: 'frame' };

export const FRAME: Look = { kind: 'frame' };
const MEDIA_BOX: Landing = { fit: 'cover' };

/** Only pictures that exist at both ends fly as pictures; text would reflow mid-flight. */
export function lookOf(card: CardModel): Look {
  const media = feedMediaOf(card);
  if (media.kind !== 'picture' || !media.media.uri) return FRAME;
  const landing: Landing = media.fit === 'contain' ? { fit: 'contain', ratio: media.media.naturalRatio } : MEDIA_BOX;
  return { kind: 'picture', uri: media.media.uri, landing };
}

export function landingOf(look: Look): Landing {
  return look.kind === 'picture' ? look.landing : MEDIA_BOX;
}
