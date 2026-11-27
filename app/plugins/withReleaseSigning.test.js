const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { addReleaseSigning } = require('./withReleaseSigning.js');

const GENERATED = `android {
    signingConfigs {
        debug {
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {
        debug {
            signingConfig signingConfigs.debug
        }
        release {
            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug
            minifyEnabled enableMinifyInReleaseBuilds
        }
    }
}`;

function releaseBlock(gradle) {
  return gradle.slice(gradle.indexOf('        release {\n            //'));
}

describe('addReleaseSigning', () => {
  it('adds an upload signing config read from the environment', () => {
    const signed = addReleaseSigning(GENERATED);

    assert.match(signed, /upload \{\n\s+storeFile file\(System\.getenv\('HANG_UPLOAD_STORE_FILE'\)/);
    assert.match(signed, /keyAlias System\.getenv\('HANG_UPLOAD_KEY_ALIAS'\)/);
  });

  it('signs release builds with the upload key only when one is given', () => {
    const signed = addReleaseSigning(GENERATED);

    assert.match(releaseBlock(signed), /signingConfig System\.getenv\('HANG_UPLOAD_STORE_FILE'\) \? signingConfigs\.upload : signingConfigs\.debug/);
    assert.match(signed, /debug \{\n\s+signingConfig signingConfigs\.debug\n/);
  });

  it('changes nothing when run again', () => {
    const once = addReleaseSigning(GENERATED);

    assert.equal(addReleaseSigning(once), once);
  });

  it('fails when the generated signing configs are not where it expects', () => {
    assert.throws(() => addReleaseSigning('android {}'), /withReleaseSigning/);
  });
});
