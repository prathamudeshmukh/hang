const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { withReleaseVersion } = require('./releaseVersion.js');

const CONFIG = Object.freeze({ name: 'Hang', version: '1.0.0', android: Object.freeze({ package: 'com.prathamesh.hang' }) });

describe('withReleaseVersion', () => {
  it('numbers the build from HANG_VERSION_CODE', () => {
    const released = withReleaseVersion(CONFIG, { HANG_VERSION_CODE: '412' });

    assert.equal(released.android.versionCode, 412);
    assert.equal(released.version, '1.0.412');
    assert.equal(released.android.package, 'com.prathamesh.hang');
  });

  it('leaves the config as it was when HANG_VERSION_CODE is not set', () => {
    const released = withReleaseVersion(CONFIG, {});

    assert.deepEqual(released, CONFIG);
  });

  it('fails on a code that is not a positive whole number', () => {
    for (const code of ['0', '-3', '1.5', 'abc', '']) {
      assert.throws(() => withReleaseVersion(CONFIG, { HANG_VERSION_CODE: code }), /HANG_VERSION_CODE/);
    }
  });

  it('fails on a code above what Play accepts', () => {
    assert.throws(() => withReleaseVersion(CONFIG, { HANG_VERSION_CODE: '2100000001' }), /HANG_VERSION_CODE/);
  });
});
