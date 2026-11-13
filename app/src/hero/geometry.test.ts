/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { centringShift, feedMediaRect, fittedRect, insetRect, isFullyInside, landingRect } from './geometry.ts';

const FEED = { width: 400, height: 1000 };
const VIEWPORT = { x: 0, y: 0, width: 400, height: 800 };

describe('feedMediaRect', () => {
  it('is the top of the page at full width, MEDIA_SHARE tall', () => {
    assert.deepEqual(feedMediaRect(FEED), { x: 0, y: 0, width: 400, height: 560 });
  });
});

describe('fittedRect', () => {
  it('fits a tall image to the box height, centred across', () => {
    assert.deepEqual(fittedRect({ x: 0, y: 0, width: 400, height: 560 }, 2), { x: 60, y: 0, width: 280, height: 560 });
  });

  it('fits a wide image to the box width, centred down', () => {
    assert.deepEqual(fittedRect({ x: 0, y: 0, width: 400, height: 560 }, 0.5), { x: 0, y: 180, width: 400, height: 200 });
  });

  it('keeps the box when the ratio is not a usable number', () => {
    assert.deepEqual(fittedRect({ x: 0, y: 0, width: 400, height: 560 }, 0), { x: 0, y: 0, width: 400, height: 560 });
  });
});

describe('landingRect', () => {
  it('lands a whole (contain) image on its fitted rect', () => {
    assert.deepEqual(landingRect(FEED, { fit: 'contain', ratio: 0.5 }), { x: 0, y: 180, width: 400, height: 200 });
  });

  it('lands everything else on the media box', () => {
    assert.deepEqual(landingRect(FEED, { fit: 'cover' }), { x: 0, y: 0, width: 400, height: 560 });
  });
});

describe('isFullyInside', () => {
  it('is true for a card wholly on screen', () => {
    assert.equal(isFullyInside({ x: 10, y: 100, width: 100, height: 200 }, VIEWPORT), true);
  });

  it('is false for a card cut off at the bottom', () => {
    assert.equal(isFullyInside({ x: 10, y: 700, width: 100, height: 200 }, VIEWPORT), false);
  });

  it('is false for a card cut off at the side (the strip)', () => {
    assert.equal(isFullyInside({ x: 350, y: 100, width: 100, height: 200 }, VIEWPORT), false);
  });
});

describe('centringShift', () => {
  it('is how far to scroll down to centre a card below the middle', () => {
    assert.equal(centringShift({ x: 0, y: 900, width: 100, height: 200 }, VIEWPORT, 'y'), 600);
  });

  it('is negative for a card off the left edge', () => {
    assert.equal(centringShift({ x: -150, y: 0, width: 100, height: 100 }, VIEWPORT, 'x'), -300);
  });
});

describe('insetRect', () => {
  it('takes the system bars off a wall that draws under them', () => {
    assert.deepEqual(insetRect({ x: 0, y: 0, width: 400, height: 800 }, { top: 24, bottom: 48 }), { x: 0, y: 24, width: 400, height: 728 });
  });

  it('never goes below zero height', () => {
    assert.equal(insetRect({ x: 0, y: 0, width: 400, height: 50 }, { top: 40, bottom: 40 }).height, 0);
  });
});
