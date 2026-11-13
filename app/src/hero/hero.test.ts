/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FRAME } from './look.ts';
import { aCard, CARD_RECT, FEED, flush, heroHarness, SCOPE } from './testing/heroHarness.ts';

const IDS = ['z', 'a', 'b'];

function withFace(harness: ReturnType<typeof heroHarness>) {
  harness.origins.addFace({ scope: SCOPE, id: 'a' }, () => Promise.resolve(CARD_RECT));
  return harness;
}

async function openAndLand(harness: ReturnType<typeof heroHarness>) {
  harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
  await flush();
  harness.hero.flyerDrawn();
  harness.hero.feedDrawn('a');
  await flush();
}

describe('hero: out to the feed', () => {
  it('flies the tapped print to the feed media box, with the feed hidden until it lands', async () => {
    const harness = withFace(heroHarness());
    await openAndLand(harness);
    assert.deepEqual(harness.calls, ['feed:0:0', 'board:out', 'push', 'fly:picture', 'feed:1:0', 'leave:out']);
    assert.deepEqual(harness.flights[0].to, { x: 0, y: 0, width: FEED.width, height: 560 });
    assert.equal(harness.hero.trip().phase, 'idle');
  });

  it('waits for the flyer to draw before opening the feed, so mounting it can’t starve the boarding wait', async () => {
    const harness = withFace(heroHarness());
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    assert.equal(harness.pushes.length, 0);
  });

  it('opens the feed on the list as the wall shows it', async () => {
    const harness = withFace(heroHarness());
    await openAndLand(harness);
    assert.deepEqual(harness.pushes, [{ ids: IDS, start: 'a' }]);
  });

  it('flies an empty frame when the thumbnail never draws', async () => {
    const harness = withFace(heroHarness({ timeoutsFire: true }));
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    assert.deepEqual([harness.calls.includes('fly:frame'), harness.flights[1].look], [true, FRAME]);
  });

  it('stops waiting for a feed image that never draws', async () => {
    const harness = withFace(heroHarness({ timeoutsFire: true }));
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    assert.equal(harness.hero.trip().phase, 'idle');
  });

  it('drops a second tap while the first is in the air', async () => {
    const harness = withFace(heroHarness());
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    harness.hero.open({ ids: IDS, card: aCard({ id: 'b' }), scope: SCOPE });
    await flush();
    harness.hero.flyerDrawn();
    await flush();
    assert.equal(harness.pushes.length, 1);
  });

  it('cross-fades in 120ms under reduce motion', async () => {
    const harness = withFace(heroHarness({ reduceMotion: true }));
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    assert.deepEqual(harness.calls, ['feed:0:0', 'push', 'feed:1:120']);
  });

  it('cross-fades when the print cannot be measured', async () => {
    const harness = heroHarness();
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    assert.deepEqual(harness.calls, ['feed:0:0', 'push', 'feed:1:340']);
  });

  it('just opens the feed before the layer is mounted', async () => {
    const harness = withFace(heroHarness({ withStage: false }));
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    assert.deepEqual(harness.calls, ['push']);
  });

  it('puts everything down and shows the feed when the flight fails', async () => {
    const harness = withFace(heroHarness({ failFlight: true }));
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    harness.hero.flyerDrawn();
    await flush();
    assert.deepEqual([harness.hero.trip().phase, harness.calls.at(-1), harness.warnings.length], ['idle', 'feed:1:0', 1]);
  });
});

describe('hero: back to the wall', () => {
  async function openedHarness(options: Parameters<typeof heroHarness>[0] = {}) {
    const harness = withFace(heroHarness(options));
    harness.origins.addFace({ scope: SCOPE, id: 'b' }, () => Promise.resolve({ ...CARD_RECT, y: 400 }));
    harness.origins.addOrigin(SCOPE, { reveal: (id) => Promise.resolve(id === 'b' ? { ...CARD_RECT, y: 400 } : null) });
    if (options.reduceMotion) {
      harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
      await flush();
    } else {
      await openAndLand(harness);
    }
    harness.calls.length = 0;
    harness.flights.length = 0;
    return harness;
  }

  it('flies the page on screen back to its print, popping the feed under cover first', async () => {
    const harness = await openedHarness();
    harness.hero.back({ card: aCard({ id: 'b' }), feed: FEED, pop: () => harness.calls.push('pop') });
    await flush();
    harness.hero.flyerDrawn();
    harness.origins.markDrawn({ scope: SCOPE, id: 'b' });
    await flush();
    assert.deepEqual(harness.calls, ['board:back', 'feed:0:0', 'pop', 'fly:picture', 'leave:back']);
    assert.deepEqual(harness.flights[0].to, { ...CARD_RECT, y: 400 });
  });

  it('cross-fades back over 340ms when there is nothing to land on (moved away)', async () => {
    const harness = await openedHarness();
    harness.hero.back({ card: aCard({ id: 'gone' }), feed: FEED, pop: () => harness.calls.push('pop') });
    await flush();
    assert.deepEqual(harness.calls, ['feed:0:340', 'pop']);
  });

  it('cross-fades back over 120ms under reduce motion, still revealing the item', async () => {
    const harness = await openedHarness({ reduceMotion: true });
    harness.hero.back({ card: aCard({ id: 'b' }), feed: FEED, pop: () => harness.calls.push('pop') });
    await flush();
    assert.deepEqual(harness.calls, ['feed:0:120', 'pop']);
  });

  it('ignores back while a trip is in the air', async () => {
    const harness = withFace(heroHarness());
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    const pops: string[] = [];
    harness.hero.back({ card: aCard(), feed: FEED, pop: () => pops.push('pop') });
    await flush();
    assert.deepEqual(pops, []);
  });

  it('just pops before the layer is mounted', async () => {
    const harness = heroHarness({ withStage: false });
    const pops: string[] = [];
    harness.hero.back({ card: aCard(), feed: FEED, pop: () => pops.push('pop') });
    await flush();
    assert.deepEqual(pops, ['pop']);
  });

  it('cross-fades back when the page is gone (nothing left in the feed)', async () => {
    const harness = await openedHarness();
    harness.hero.back({ card: null, feed: FEED, pop: () => harness.calls.push('pop') });
    await flush();
    assert.deepEqual(harness.calls, ['feed:0:340', 'pop']);
  });
});

describe('hero: listeners', () => {
  it('tells subscribers when the trip changes, until they leave', async () => {
    const harness = withFace(heroHarness());
    const seen: string[] = [];
    const leave = harness.hero.subscribe(() => seen.push(harness.hero.trip().phase));
    harness.hero.open({ ids: IDS, card: aCard(), scope: SCOPE });
    await flush();
    leave();
    harness.hero.flyerDrawn();
    await flush();
    assert.deepEqual(seen, ['boarding']);
  });
});
