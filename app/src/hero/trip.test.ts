/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { FRAME, type Look } from './look.ts';
import { hidesFace, hidesFeedMedia, IDLE, inAir, nextTrip, type Flight, type Trip, type TripEvent } from './trip.ts';

const PICTURE: Look = { kind: 'picture', uri: 'file:///t.jpg', landing: { fit: 'cover' } };
const FLIGHT: Flight = {
  id: 'a',
  scope: 'inbox',
  direction: 'out',
  look: PICTURE,
  from: { x: 10, y: 300, width: 100, height: 120 },
  to: { x: 0, y: 0, width: 400, height: 560 },
};

const run = (events: readonly TripEvent[], from: Trip = IDLE) => events.reduce(nextTrip, from);
const boarded = (): Trip => run([{ type: 'board', flight: FLIGHT }]);

describe('a flight', () => {
  it('waits on the ground until the flyer is drawn', () => {
    assert.equal(boarded().phase, 'boarding');
  });

  it('takes off once the flyer is drawn', () => {
    assert.equal(run([{ type: 'flyerDrawn' }], boarded()).phase, 'flying');
  });

  it('becomes a frame flight when the flyer never draws (missing thumbnail)', () => {
    const trip = run([{ type: 'boardingTimedOut' }], boarded());
    assert.deepEqual(trip.phase === 'flying' && [trip.phase, trip.flight.look], ['flying', FRAME]);
  });

  it('settles after landing until the destination is drawn', () => {
    assert.equal(run([{ type: 'flyerDrawn' }, { type: 'landed' }], boarded()).phase, 'settling');
  });

  it('goes straight to leaving when the destination was drawn mid-flight', () => {
    const trip = run([{ type: 'flyerDrawn' }, { type: 'destinationDrawn' }, { type: 'landed' }], boarded());
    assert.equal(trip.phase, 'leaving');
  });

  it('leaves once the destination is drawn, or the settle wait runs out', () => {
    const settling = run([{ type: 'flyerDrawn' }, { type: 'landed' }], boarded());
    assert.deepEqual([nextTrip(settling, { type: 'destinationDrawn' }).phase, nextTrip(settling, { type: 'settleTimedOut' }).phase], ['leaving', 'leaving']);
  });

  it('is over when the flyer has faded away', () => {
    const trip = run([{ type: 'flyerDrawn' }, { type: 'landed' }, { type: 'destinationDrawn' }, { type: 'cleared' }], boarded());
    assert.equal(trip, IDLE);
  });
});

describe('a cross-fade (no flyer)', () => {
  it('fades, then is over', () => {
    const fading = run([{ type: 'fade', direction: 'back', durationMs: 340 }]);
    assert.deepEqual([fading.phase, nextTrip(fading, { type: 'cleared' })], ['fading', IDLE]);
  });
});

describe('guards', () => {
  it('drops a second departure while one is in the air (double tap)', () => {
    const trip = boarded();
    assert.equal(nextTrip(trip, { type: 'board', flight: { ...FLIGHT, id: 'b' } }), trip);
  });

  it('drops a fade while a flight is in the air', () => {
    const trip = boarded();
    assert.equal(nextTrip(trip, { type: 'fade', direction: 'out', durationMs: 120 }), trip);
  });

  it('ignores events that do not belong to the current phase', () => {
    assert.equal(nextTrip(IDLE, { type: 'landed' }), IDLE);
  });

  it('comes down at once when something went wrong mid-trip', () => {
    assert.equal(nextTrip(boarded(), { type: 'abort' }), IDLE);
  });

  it('is in the air from boarding to the end of a fade', () => {
    assert.deepEqual([inAir(IDLE), inAir(boarded())], [false, true]);
  });
});

describe('hidesFace', () => {
  const A = { scope: 'inbox', id: 'a' };

  it('hides the print the flyer stands in for while it is in the air, so it is never seen twice', () => {
    const flying = run([{ type: 'flyerDrawn' }], boarded());
    assert.deepEqual([hidesFace(boarded(), A), hidesFace(flying, A)], [true, true]);
  });

  it('shows it again once the flight has landed', () => {
    assert.equal(hidesFace(run([{ type: 'flyerDrawn' }, { type: 'landed' }], boarded()), A), false);
  });

  it('leaves the same item on another wall alone', () => {
    assert.equal(hidesFace(boarded(), { scope: 'home:strip', id: 'a' }), false);
  });
});

describe('hidesFeedMedia', () => {
  const back = (): Trip => run([{ type: 'board', flight: { ...FLIGHT, direction: 'back' } }]);

  it('keeps the feed media drawn until the flyer covering it is drawn, so nothing flashes', () => {
    assert.equal(hidesFeedMedia(back(), 'a'), false);
  });

  it('hides it from take-off until the trip ends, so the flyer leaves no copy behind', () => {
    const flying = run([{ type: 'flyerDrawn' }], back());
    const leaving = run([{ type: 'landed' }, { type: 'destinationDrawn' }], flying);
    assert.deepEqual([hidesFeedMedia(flying, 'a'), hidesFeedMedia(leaving, 'a')], [true, true]);
  });

  it('leaves other pages, and flights out to the feed, alone', () => {
    const outFlying = run([{ type: 'flyerDrawn' }], boarded());
    const backFlying = run([{ type: 'flyerDrawn' }], back());
    assert.deepEqual([hidesFeedMedia(outFlying, 'a'), hidesFeedMedia(backFlying, 'b')], [false, false]);
  });
});
