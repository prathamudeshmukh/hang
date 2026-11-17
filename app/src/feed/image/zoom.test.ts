/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { clampScale, doubleTapScale, fittedSize, panLimit, settledView, wantsOriginal, withGive, ZOOM, zoomAt } from './zoom.ts';

const PAGE = { width: 400, height: 900 };
const AT_REST = { scale: 1, x: 0, y: 0 };

describe('fittedSize', () => {
  it('fits a wide image to the page width', () => {
    assert.deepEqual(fittedSize(PAGE, 0.5), { width: 400, height: 200 });
  });

  it('fits a tall screenshot to the page height', () => {
    assert.deepEqual(fittedSize(PAGE, 4.5), { width: 200, height: 900 });
  });

  it('fills the page when the ratio is not usable', () => {
    assert.deepEqual(fittedSize(PAGE, 0), PAGE);
  });
});

describe('doubleTapScale', () => {
  it('zooms an ordinary image to the fixed step', () => {
    assert.equal(doubleTapScale(PAGE, 0.75), ZOOM.doubleTap);
  });

  it('zooms an image taller than the page until it fills the width', () => {
    assert.equal(doubleTapScale(PAGE, 4.5), 2);
  });

  it('never zooms a very long screenshot past the limit', () => {
    assert.equal(doubleTapScale(PAGE, 40), ZOOM.max);
  });
});

describe('clampScale', () => {
  it('keeps a zoom inside 1× and the limit', () => {
    assert.deepEqual([clampScale(0.4), clampScale(3), clampScale(9)], [1, 3, ZOOM.max]);
  });
});

describe('panLimit', () => {
  it('lets a zoomed image pan only as far as its edges', () => {
    assert.deepEqual(panLimit(PAGE, { width: 400, height: 200 }, 2), { x: 200, y: 0 });
  });

  it('allows no pan at 1×', () => {
    assert.deepEqual(panLimit(PAGE, { width: 400, height: 200 }, 1), { x: 0, y: 0 });
  });
});

describe('zoomAt', () => {
  it('keeps the point under the fingers still', () => {
    assert.deepEqual(zoomAt(AT_REST, { x: 100, y: 0 }, 2), { scale: 2, x: -100, y: 0 });
  });

  it('zooms about the centre without moving it', () => {
    assert.deepEqual(zoomAt({ scale: 2, x: -100, y: 0 }, { x: 0, y: 0 }, 4), { scale: 4, x: -200, y: 0 });
  });
});

describe('settledView', () => {
  it('pulls a pan back inside the image’s edges', () => {
    assert.deepEqual(settledView({ scale: 2, x: -350, y: 40 }, PAGE, 0.5), { scale: 2, x: -200, y: 0 });
  });

  it('brings a pinch below 1× back to rest', () => {
    assert.deepEqual(settledView({ scale: 0.6, x: 30, y: 20 }, PAGE, 0.5), AT_REST);
  });

  it('brings a pinch past the limit back to it', () => {
    assert.equal(settledView({ scale: 7, x: 0, y: 0 }, PAGE, 0.5).scale, ZOOM.max);
  });
});

describe('withGive', () => {
  it('leaves a pan inside the edges alone', () => {
    assert.equal(withGive(80, 100), 80);
  });

  it('gives only a little past an edge, either way', () => {
    assert.deepEqual([withGive(200, 100), withGive(-200, 100)], [100 + 100 * ZOOM.give, -100 - 100 * ZOOM.give]);
  });
});

describe('wantsOriginal', () => {
  it('is false at rest and true once zoomed past the threshold', () => {
    assert.deepEqual([wantsOriginal(1), wantsOriginal(ZOOM.original + 0.01)], [false, true]);
  });
});
