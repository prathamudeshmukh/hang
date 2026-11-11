/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createIdGenerator } from './newId.ts';

const UUID_V7 = /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const T = Date.parse('2026-11-11T09:00:00.000Z');

describe('createIdGenerator', () => {
  it('makes UUIDv7s whose leading bits are the clock time', () => {
    const newId = createIdGenerator({ randomBytes: (size) => new Uint8Array(size).fill(7), clock: { now: () => T } });
    const id = newId();
    assert.match(id, UUID_V7);
    assert.equal(parseInt(id.replace(/-/g, '').slice(0, 12), 16), T);
  });

  it('draws fresh random bytes for every id', () => {
    let calls = 0;
    const newId = createIdGenerator({
      randomBytes: (size) => new Uint8Array(size).fill(++calls),
      clock: { now: () => T },
    });
    assert.notEqual(newId(), newId());
  });

  it('refuses a random source that returns too few bytes', () => {
    const newId = createIdGenerator({ randomBytes: () => new Uint8Array(4), clock: { now: () => T } });
    assert.throws(() => newId(), /random/i);
  });
});
