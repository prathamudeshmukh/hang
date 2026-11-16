/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { contentRoom, pictureBox, pictureCap, postWordsTop, wordsPlace, wordsRoom } from './postLayout.ts';

describe('postWordsTop', () => {
  it('starts the words under the status bar, the counter row, the note and one rhythm', () => {
    assert.equal(postWordsTop({ topInset: 24, fontScale: 1 }), 24 + 48 + 18 + 14);
  });

  it('moves the words down as the note grows with the system font scale', () => {
    assert.equal(postWordsTop({ topInset: 24, fontScale: 2 }), 24 + 48 + 36 + 14);
  });
});

describe('wordsPlace', () => {
  const frame = { width: 360, height: 760, wordsTop: 104 };

  it('is the measure, margin to margin, at the words’ top, at the print’s own shape', () => {
    assert.deepEqual(wordsPlace(frame, 0.5), { x: 16, y: 104, width: 328, height: 164 });
  });

  it('never runs past the bottom of the page', () => {
    assert.equal(wordsPlace(frame, 10).height, 760 - 104);
  });

  it('keeps the measure’s width for a print with no usable shape', () => {
    assert.deepEqual(wordsPlace(frame, 0), { x: 16, y: 104, width: 328, height: 0 });
  });
});

describe('pictureCap', () => {
  it('is 40% of the page', () => {
    assert.equal(pictureCap(760), 304);
  });
});

describe('pictureBox', () => {
  it('fills the measure at the picture’s own shape when that is short enough', () => {
    assert.deepEqual(pictureBox({ width: 328, ratio: 9 / 16, maxHeight: 304 }), { width: 328, height: 184.5 });
  });

  it('sits narrower when a tall picture meets the cap, keeping its shape', () => {
    assert.deepEqual(pictureBox({ width: 328, ratio: 1.5, maxHeight: 300 }), { width: 200, height: 300 });
  });

  it('has no box for a picture with no usable shape', () => {
    assert.equal(pictureBox({ width: 328, ratio: Number.NaN, maxHeight: 300 }), null);
  });
});

describe('contentRoom', () => {
  it('is the body less the gaps around the words and the imprint’s line', () => {
    assert.equal(contentRoom({ body: 500, imprint: 20 }), 500 - 14 - 16 - 20 - 24);
  });

  it('is never negative on a page too short for anything', () => {
    assert.equal(contentRoom({ body: 30, imprint: 20 }), 0);
  });
});

describe('wordsRoom', () => {
  it('is the whole content room without a picture', () => {
    assert.equal(wordsRoom(426, null), 426);
  });

  it('leaves the seam and the picture below the words', () => {
    assert.equal(wordsRoom(426, 200), 426 - 33 - 200);
  });
});
