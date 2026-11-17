import { expect } from '@std/expect';
import { describe, it } from '@std/testing/bdd';
import { PARAGRAPH_BREAK, paragraphText } from '../paragraphs.ts';

const html = (...paragraphs: string[]) => `<div>${paragraphs.join('')}</div>`;

describe('paragraphText', () => {
  it('joins the article paragraphs with a blank line', () => {
    const text = paragraphText(html('<p>First one.</p>', '<p>Second one.</p>'), {});
    expect(text).toBe(`First one.${PARAGRAPH_BREAK}Second one.`);
  });

  it('collapses whitespace inside a paragraph, including line breaks in the markup', () => {
    expect(paragraphText(html('<p>  Spread\n   over <em>lines</em>\t here. </p>'), {})).toBe('Spread over lines here.');
  });

  it('leaves out headings, captions, lists and code', () => {
    const content = html('<h2>Part one</h2>', '<p>Body.</p>', '<figure><figcaption>A photo</figcaption></figure>', '<ul><li>item</li></ul>', '<pre>code</pre>');
    expect(paragraphText(content, {})).toBe('Body.');
  });

  it('drops a paragraph that repeats the title or the byline', () => {
    const content = html('<p>The Slow Death</p>', '<p>By A. Writer</p>', '<p>There was a time.</p>');
    expect(paragraphText(content, { title: 'The slow death', byline: 'By A. Writer' })).toBe('There was a time.');
  });

  it('drops a "By …" paragraph when the byline is just the name', () => {
    expect(paragraphText(html('<p>By A. Writer</p>', '<p>Text.</p>'), { byline: 'A. Writer' })).toBe('Text.');
  });

  it('drops empty paragraphs', () => {
    expect(paragraphText(html('<p> </p>', '<p>Only this.</p>', '<p></p>'), {})).toBe('Only this.');
  });

  it('is empty when the content has no paragraphs', () => {
    expect(paragraphText('<div>Just a div</div>', {})).toBe('');
  });
});
