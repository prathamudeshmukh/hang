import { pageMediaOf } from '../feed/feedPage.ts';
import type { CardModel } from '../grid/cardModel.ts';
import type { Landing } from './geometry.ts';

/** What flies: the thumbnail itself, or an empty `raised` print for faces made of text (#32 decision 2). */
export type Look = { readonly kind: 'picture'; readonly uri: string; readonly landing: Landing } | { readonly kind: 'frame'; readonly landing: Landing };

const MEDIA_BOX: Landing = { fit: 'cover' };
export const FRAME: Look = { kind: 'frame', landing: MEDIA_BOX };
/** A post page has no media box: its print lands where the words begin (#59). */
const POST_FRAME: Look = { kind: 'frame', landing: { fit: 'words' } };
/** An imageless article that opens on its text has no media box either: its print lands on the text block (#61). */
const TEXT_FRAME: Look = { kind: 'frame', landing: { fit: 'text' } };

/** Only pictures that exist at both ends fly as pictures; text would reflow mid-flight. */
export function lookOf(card: CardModel, hasOpening = false): Look {
  const media = pageMediaOf(card, hasOpening);
  if (media.kind === 'post') return POST_FRAME;
  if (media.kind === 'none') return TEXT_FRAME;
  if (media.kind !== 'picture' || !media.media.uri) return FRAME;
  const landing: Landing = media.fit === 'contain' ? { fit: 'contain', ratio: media.media.naturalRatio } : MEDIA_BOX;
  return { kind: 'picture', uri: media.media.uri, landing };
}
