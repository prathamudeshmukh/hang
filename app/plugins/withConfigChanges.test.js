const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { handleConfigChanges, HANDLED_CHANGES } = require('./withConfigChanges.js');

const MAIN = '.MainActivity';
const SHARE = '.ShareActivity';

function manifestWith(...activities) {
  return { manifest: { application: [{ activity: activities }] } };
}

function activity(name, configChanges) {
  const attributes = configChanges === undefined ? { 'android:name': name } : { 'android:name': name, 'android:configChanges': configChanges };
  return { $: attributes };
}

function configChangesOf(manifest, name) {
  const found = manifest.manifest.application[0].activity.find((a) => a.$['android:name'] === name);
  return found.$['android:configChanges'];
}

describe('handleConfigChanges', () => {
  it('adds the handled changes to MainActivity and keeps the ones it had', () => {
    const manifest = manifestWith(activity(MAIN, 'keyboard|orientation|uiMode'));

    const handled = handleConfigChanges(manifest);

    assert.equal(configChangesOf(handled, MAIN), 'keyboard|orientation|uiMode|fontScale|density|locale|layoutDirection|fontWeightAdjustment');
  });

  it('gives MainActivity the handled changes when it had none', () => {
    const manifest = manifestWith(activity(MAIN));

    const handled = handleConfigChanges(manifest);

    assert.equal(configChangesOf(handled, MAIN), HANDLED_CHANGES.join('|'));
  });

  it('adds nothing twice when run again', () => {
    const once = handleConfigChanges(manifestWith(activity(MAIN, 'keyboard|density')));

    const twice = handleConfigChanges(once);

    assert.equal(configChangesOf(twice, MAIN), 'keyboard|density|fontScale|locale|layoutDirection|fontWeightAdjustment');
  });

  it('leaves other activities and the given manifest as they were', () => {
    const manifest = manifestWith(activity(MAIN, 'keyboard'), activity(SHARE, 'uiMode'));

    const handled = handleConfigChanges(manifest);

    assert.equal(configChangesOf(handled, SHARE), 'uiMode');
    assert.equal(configChangesOf(manifest, MAIN), 'keyboard');
  });

  it('fails when the manifest has no MainActivity', () => {
    const manifest = manifestWith(activity(SHARE, 'uiMode'));

    assert.throws(() => handleConfigChanges(manifest), /no \.MainActivity/);
  });
});
