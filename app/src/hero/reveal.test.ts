/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Rect } from './geometry.ts';
import { revealInList, revealInScrollers, type ScrollerStep } from './reveal.ts';

const SCREEN: Rect = { x: 0, y: 0, width: 400, height: 800 };
const nextFrame = () => Promise.resolve();

/** A face that moves when its scroller scrolls, as a real one would. */
function fakeWorld(start: Rect) {
  let rect = start;
  const scrolls: [string, number][] = [];
  const scroller = (axis: 'x' | 'y', viewport: Rect): ScrollerStep => ({
    axis,
    viewport: () => Promise.resolve(viewport),
    scrollBy: (delta) => {
      scrolls.push([axis, delta]);
      rect = { ...rect, [axis]: rect[axis] - delta };
    },
  });
  return { face: () => Promise.resolve(rect), scroller, scrolls };
}

describe('revealInScrollers (Home: the strip, then the page)', () => {
  it('leaves a fully visible print where it is', async () => {
    const world = fakeWorld({ x: 20, y: 200, width: 76, height: 98 });
    const rect = await revealInScrollers({ face: world.face, steps: [world.scroller('x', SCREEN), world.scroller('y', SCREEN)], nextFrame });
    assert.deepEqual([rect, world.scrolls], [{ x: 20, y: 200, width: 76, height: 98 }, []]);
  });

  it('centres a print cut off by the strip’s edge, then measures it again', async () => {
    const world = fakeWorld({ x: 380, y: 200, width: 76, height: 98 });
    const rect = await revealInScrollers({ face: world.face, steps: [world.scroller('x', SCREEN), world.scroller('y', SCREEN)], nextFrame });
    assert.deepEqual([rect?.x, world.scrolls], [162, [['x', 218]]]);
  });

  it('has no target when the print is not there', async () => {
    const rect = await revealInScrollers({ face: () => Promise.resolve(null), steps: [], nextFrame });
    assert.equal(rect, null);
  });
});

describe('revealInList (a virtualised wall)', () => {
  const VISIBLE: Rect = { x: 10, y: 300, width: 180, height: 240 };

  it('leaves a fully visible card where it is', async () => {
    const jumps: number[] = [];
    const rect = await revealInList({ index: 4, face: () => Promise.resolve(VISIBLE), viewport: () => Promise.resolve(SCREEN), jumpTo: (at) => jumps.push(at), nextFrame });
    assert.deepEqual([rect, jumps], [VISIBLE, []]);
  });

  it('jumps to a card that is not drawn, and waits for its cell to mount', async () => {
    const jumps: number[] = [];
    let mounted = false;
    const face = () => Promise.resolve(mounted ? VISIBLE : null);
    const frames = { count: 0 };
    const rect = await revealInList({
      index: 40,
      face,
      viewport: () => Promise.resolve(SCREEN),
      jumpTo: (at) => jumps.push(at),
      nextFrame: () => {
        frames.count += 1;
        mounted = frames.count >= 3;
        return Promise.resolve();
      },
    });
    assert.deepEqual([rect, jumps], [VISIBLE, [40]]);
  });

  it('waits for a freshly mounted card to stop moving before saying where it is (masonry re-layout)', async () => {
    const positions = [null, { ...VISIBLE, y: 2000 }, { ...VISIBLE, y: 900 }, VISIBLE, VISIBLE];
    let reads = 0;
    const face = () => Promise.resolve(positions[Math.min(reads++, positions.length - 1)]);
    const rect = await revealInList({ index: 30, face, viewport: () => Promise.resolve(SCREEN), jumpTo: () => undefined, nextFrame });
    assert.deepEqual(rect, VISIBLE);
  });

  it('jumps to a card cut off at the bottom', async () => {
    const jumps: number[] = [];
    await revealInList({ index: 2, face: () => Promise.resolve({ ...VISIBLE, y: 700 }), viewport: () => Promise.resolve(SCREEN), jumpTo: (at) => jumps.push(at), nextFrame });
    assert.deepEqual(jumps, [2]);
  });

  it('has no target when the item is not on this wall (moved, deleted)', async () => {
    const rect = await revealInList({ index: -1, face: () => Promise.resolve(VISIBLE), viewport: () => Promise.resolve(SCREEN), jumpTo: () => undefined, nextFrame });
    assert.equal(rect, null);
  });

  it('gives up when the cell never mounts', async () => {
    const rect = await revealInList({ index: 9, face: () => Promise.resolve(null), viewport: () => Promise.resolve(SCREEN), jumpTo: () => undefined, nextFrame });
    assert.equal(rect, null);
  });
});
