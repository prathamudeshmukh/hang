/// <reference types="node" />
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AT_REST, chromeHiddenOn, createImageViewer, nextViewer, showPage, type ViewerEvent } from './imageChrome.ts';

const after = (...events: ViewerEvent[]) => events.reduce(nextViewer, AT_REST);

describe('nextViewer', () => {
  it('starts with the chrome showing and the image at rest', () => {
    assert.deepEqual(AT_REST, { shownId: null, chromeHidden: false, zoomed: false });
  });

  it('hides the chrome on a tap and shows it on the next', () => {
    assert.deepEqual([after('tap').chromeHidden, after('tap', 'tap').chromeHidden], [true, false]);
  });

  it('hides the chrome when the image is zoomed', () => {
    assert.deepEqual([after('zoomedIn').chromeHidden, after('zoomedIn').zoomed], [true, true]);
  });

  it('keeps the chrome hidden after zooming back out', () => {
    assert.deepEqual([after('zoomedIn', 'zoomedOut').chromeHidden, after('zoomedIn', 'zoomedOut').zoomed], [true, false]);
  });

});

describe('showPage', () => {
  it('starts every new page with its chrome', () => {
    assert.deepEqual(showPage(after('tap', 'zoomedIn'), 'b'), { shownId: 'b', chromeHidden: false, zoomed: false });
  });

  it('changes nothing when the same page is shown again', () => {
    const shown = showPage(after('tap'), 'a');
    assert.equal(showPage(shown, 'a'), shown);
  });
});

describe('chromeHiddenOn', () => {
  it('hides only the chrome of the page on screen, not of its neighbours', () => {
    const hidden = nextViewer(showPage(AT_REST, 'a'), 'tap');
    assert.deepEqual([chromeHiddenOn(hidden, 'a'), chromeHiddenOn(hidden, 'b')], [true, false]);
  });
});

describe('createImageViewer', () => {
  it('tells subscribers when the state changes', () => {
    const viewer = createImageViewer();
    let heard = 0;
    viewer.subscribe(() => heard++);
    viewer.send('tap');
    assert.deepEqual([heard, viewer.state().chromeHidden], [1, true]);
  });

  it('keeps the same state object when nothing changes, so nothing redraws', () => {
    const viewer = createImageViewer();
    const before = viewer.state();
    viewer.send('zoomedOut');
    assert.equal(viewer.state(), before);
  });

  it('asks the zoomed image to zoom out on back, and says it did', () => {
    const viewer = createImageViewer();
    let zoomedOut = false;
    viewer.onZoomOut(() => (zoomedOut = true));
    viewer.send('zoomedIn');
    assert.deepEqual([viewer.backZoomsOut(), zoomedOut], [true, true]);
  });

  it('lets back close the feed when the image is at rest', () => {
    const viewer = createImageViewer();
    viewer.onZoomOut(() => assert.fail('must not zoom out at rest'));
    assert.equal(viewer.backZoomsOut(), false);
  });

  it('stops asking an image that has gone away', () => {
    const viewer = createImageViewer();
    const forget = viewer.onZoomOut(() => assert.fail('the image is gone'));
    forget();
    viewer.send('zoomedIn');
    assert.equal(viewer.backZoomsOut(), false);
  });
});
