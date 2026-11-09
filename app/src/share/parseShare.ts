/** What Android's share intent hands to ShareActivity (see plugins/withShareActivity.js). */
export interface ShareIntentProps {
  readonly text?: string | null;
  readonly subject?: string | null;
  readonly title?: string | null;
  readonly type?: string | null;
  readonly stream?: string | null;
}

export type ShareKind = 'link' | 'image' | 'unsupported';

export interface ParsedShare {
  readonly kind: ShareKind;
  readonly url?: string;
  /** SPEC §4 `shared_title`: what the source app called it. Used when the site blocks our server. */
  readonly sharedTitle?: string;
  readonly imageUri?: string;
}

const HTTP_URL = /https?:\/\/[^\s<>"']+/i;

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function titleAround(text: string, url: string): string | undefined {
  return clean(text.replace(url, ''));
}

export function parseShare(props: ShareIntentProps): ParsedShare {
  const text = props.text ?? '';
  const url = HTTP_URL.exec(text)?.[0] ?? HTTP_URL.exec(props.subject ?? '')?.[0];
  const imageUri = props.type?.startsWith('image/') ? clean(props.stream) : undefined;
  const sharedTitle = clean(props.subject) ?? clean(props.title) ?? (url ? titleAround(text, url) : undefined);

  if (url) return { kind: 'link', url, sharedTitle, imageUri };
  if (imageUri) return { kind: 'image', imageUri, sharedTitle };
  return { kind: 'unsupported', sharedTitle };
}
