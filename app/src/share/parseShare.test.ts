/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseShare } from './parseShare.ts';

describe('parseShare', () => {
  it('reads a Chrome share: URL in text, page title in subject', () => {
    const share = parseShare({ text: 'https://aeon.co/essays/on-boredom', subject: 'On boredom, and why it matters | Aeon' });
    assert.equal(share.url, 'https://aeon.co/essays/on-boredom');
    assert.equal(share.sharedTitle, 'On boredom, and why it matters | Aeon');
    assert.equal(share.kind, 'link');
  });

  it('takes the text before the URL as the title when there is no subject', () => {
    const share = parseShare({ text: 'How Pentagram designs a logo\nhttps://youtu.be/abc123XYZ_0?si=x' });
    assert.equal(share.url, 'https://youtu.be/abc123XYZ_0?si=x');
    assert.equal(share.sharedTitle, 'How Pentagram designs a logo');
  });

  it('leaves the title empty for a bare URL (an X post share)', () => {
    const share = parseShare({ text: 'https://x.com/someone/status/1790000000000000000?s=20' });
    assert.equal(share.sharedTitle, undefined);
    assert.equal(share.kind, 'link');
  });

  it('treats a shared image file as an image', () => {
    const share = parseShare({ type: 'image/jpeg', stream: 'content://media/external/images/media/42' });
    assert.equal(share.kind, 'image');
    assert.equal(share.imageUri, 'content://media/external/images/media/42');
  });

  it('rejects shares with neither a URL nor an image', () => {
    const share = parseShare({ text: 'just some words, no link' });
    assert.equal(share.kind, 'unsupported');
  });

  it('ignores non-http schemes in the text', () => {
    const share = parseShare({ text: 'javascript:alert(1)' });
    assert.equal(share.url, undefined);
  });
});
