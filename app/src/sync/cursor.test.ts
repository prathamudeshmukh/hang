/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { compareCursors, NIL_ID, overlapStart, serverTimestampMicros } from './cursor.ts';

describe('serverTimestampMicros', () => {
  it('keeps the microseconds Postgres sends', () => {
    const a = serverTimestampMicros('2026-11-09T10:00:00.123456+00:00');
    const b = serverTimestampMicros('2026-11-09T10:00:00.123457+00:00');
    assert.equal(b - a, 1);
  });

  it('reads trimmed fractions, no fraction, Z and other offsets alike', () => {
    const expected = serverTimestampMicros('2026-11-09T10:00:00.5+00:00');
    assert.equal(serverTimestampMicros('2026-11-09T15:30:00.500000+05:30'), expected);
    assert.equal(serverTimestampMicros('2026-11-09T10:00:00Z') + 500_000, expected);
  });

  it('rejects something that is not a timestamp', () => {
    assert.throws(() => serverTimestampMicros('yesterday'), /timestamp/);
  });
});

describe('compareCursors', () => {
  it('orders by time, then by id', () => {
    const early = { updatedAt: '2026-11-09T10:00:00.1+00:00', id: 'b' };
    const sameTimeLaterId = { updatedAt: '2026-11-09T10:00:00.100000+00:00', id: 'c' };
    assert.ok(compareCursors(early, sameTimeLaterId) < 0);
    assert.ok(compareCursors({ ...early, updatedAt: '2026-11-09T10:00:01+00:00' }, sameTimeLaterId) > 0);
  });
});

describe('overlapStart', () => {
  it('steps back by the overlap window, to the smallest id', () => {
    const start = overlapStart({ updatedAt: '2026-11-09T10:00:05.000123+00:00', id: 'x' }, 5000);
    assert.deepEqual(start, { updatedAt: '2026-11-09T10:00:00.000123Z', id: NIL_ID });
  });
});
