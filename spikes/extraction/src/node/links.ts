import { CARD_KINDS, type CardKind } from '../types.ts';
import { isHttpUrl } from '../url.ts';

export interface LinkEntry {
  readonly url: string;
  readonly expected?: CardKind;
}

function isCardKind(value: string): value is CardKind {
  return (CARD_KINDS as readonly string[]).includes(value);
}

function parseLine(line: string): LinkEntry | undefined {
  const [rawUrl = '', rawExpected = ''] = line.split('#').map((part) => part.trim());
  if (!isHttpUrl(rawUrl)) return undefined;
  return isCardKind(rawExpected) ? { url: rawUrl, expected: rawExpected } : { url: rawUrl };
}

/** One URL per line, optional `# kind`. Blank lines and `#` comments are ignored. */
export function parseLinks(text: string): readonly LinkEntry[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'))
    .map(parseLine)
    .filter((entry): entry is LinkEntry => entry !== undefined);
}
