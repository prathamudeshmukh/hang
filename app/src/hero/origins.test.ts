/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createOrigins } from './origins.ts';

const RECT = { x: 1, y: 2, width: 3, height: 4 };
const measure = () => Promise.resolve(RECT);

describe('origins', () => {
  it('measures a registered face', async () => {
    const origins = createOrigins();
    origins.addFace({ scope: 'inbox', id: 'a' }, measure);
    assert.deepEqual(await origins.measureFace({ scope: 'inbox', id: 'a' }), RECT);
  });

  it('keeps the same item apart on two walls (Home under a collection)', async () => {
    const origins = createOrigins();
    origins.addFace({ scope: 'home-strip', id: 'a' }, measure);
    assert.equal(await origins.measureFace({ scope: 'inbox', id: 'a' }), null);
  });

  it('forgets a face once its cell unmounts or is recycled', async () => {
    const origins = createOrigins();
    const remove = origins.addFace({ scope: 'inbox', id: 'a' }, measure);
    remove();
    assert.equal(await origins.measureFace({ scope: 'inbox', id: 'a' }), null);
  });

  it('does not let a stale removal drop a newer face for the same item', async () => {
    const origins = createOrigins();
    const removeOld = origins.addFace({ scope: 'inbox', id: 'a' }, measure);
    origins.addFace({ scope: 'inbox', id: 'a' }, measure);
    removeOld();
    assert.deepEqual(await origins.measureFace({ scope: 'inbox', id: 'a' }), RECT);
  });

  it('asks the wall that opened the feed to reveal the item', async () => {
    const origins = createOrigins();
    origins.addOrigin('inbox', { reveal: (id) => Promise.resolve(id === 'a' ? RECT : null) });
    assert.deepEqual(await origins.reveal({ scope: 'inbox', id: 'a' }), RECT);
  });

  it('has no target when that wall is gone (route restored, screen closed)', async () => {
    const origins = createOrigins();
    const remove = origins.addOrigin('inbox', { reveal: () => Promise.resolve(RECT) });
    remove();
    assert.equal(await origins.reveal({ scope: 'inbox', id: 'a' }), null);
  });

  it('tells a waiter once the face is drawn', async () => {
    const origins = createOrigins();
    origins.addFace({ scope: 'inbox', id: 'a' }, measure);
    const drawn = origins.whenDrawn({ scope: 'inbox', id: 'a' });
    origins.markDrawn({ scope: 'inbox', id: 'a' });
    assert.equal(await drawn, undefined);
  });

  it('answers at once for a face already drawn', async () => {
    const origins = createOrigins();
    origins.addFace({ scope: 'inbox', id: 'a' }, measure);
    origins.markDrawn({ scope: 'inbox', id: 'a' });
    assert.equal(await origins.whenDrawn({ scope: 'inbox', id: 'a' }), undefined);
  });
});
