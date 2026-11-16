import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { MAX_DESCRIPTION_LENGTH, cleanDescription } from './description.ts';

const SENTENCE = 'Free, open to anyone and asking nothing in return, the library is one of the last places of its kind.';

describe('cleanDescription', () => {
  it('keeps a real description with its whitespace collapsed', () => {
    expect(cleanDescription({ description: `  Free, open to anyone\n\n and   asking nothing.  `, title: 'Libraries' }))
      .toBe('Free, open to anyone and asking nothing.');
  });

  it('drops a missing or too-short description', () => {
    const dropped = [undefined, '   ', 'A short blurb.'].map((description) => cleanDescription({ description, title: 'Libraries' }));
    expect(dropped).toEqual([null, null, null]);
  });

  it('drops a description that only repeats the title, ignoring case and punctuation', () => {
    const title = 'The Quiet Radicalism of the Public Library';
    expect(cleanDescription({ description: 'the quiet radicalism of the public library!', title })).toBeNull();
  });

  it('caps a long description at a word, ending with an ellipsis', () => {
    const cleaned = cleanDescription({ description: `${SENTENCE} `.repeat(20), title: undefined }) ?? '';
    expect(cleaned.length).toBeLessThanOrEqual(MAX_DESCRIPTION_LENGTH);
    expect(cleaned.endsWith('…')).toBe(true);
    expect(cleaned.at(-2)).not.toBe(' ');
  });

  it('cuts between whole words and drops the punctuation before the ellipsis', () => {
    const source = `${'word '.repeat(98)}ends, here and more`;
    const cleaned = cleanDescription({ description: source, title: undefined }) ?? '';
    expect(source.startsWith(cleaned.slice(0, -1))).toBe(true);
    expect(cleaned.endsWith('ends…')).toBe(true);
  });

  it('keeps a last word that ends exactly at the cut', () => {
    const fits = `${'abcd '.repeat(99)}ab`;
    const cleaned = cleanDescription({ description: `${fits} overflowing tail`, title: undefined });
    expect(cleaned).toBe(`${fits}…`);
  });

  it('cuts mid-word when there is no space to cut at', () => {
    const cleaned = cleanDescription({ description: 'x'.repeat(MAX_DESCRIPTION_LENGTH + 10), title: undefined });
    expect(cleaned).toBe(`${'x'.repeat(MAX_DESCRIPTION_LENGTH - 1)}…`);
  });

  it('leaves a description that fits exactly untouched', () => {
    const exact = 'x'.repeat(MAX_DESCRIPTION_LENGTH);
    expect(cleanDescription({ description: exact, title: undefined })).toBe(exact);
  });
});
