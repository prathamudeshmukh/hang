// Release builds sign with the Play upload key when CI provides one (HANG_UPLOAD_* env, #25); Play re-signs with the
// app signing key it holds. Without it (local and E2E builds) they stay on debug.keystore, whose SHA-1 the dev
// Google OAuth client trusts. Kept as a config plugin so android/ stays generated.
const { withAppBuildGradle } = require('expo/config-plugins');

const STORE_FILE_ENV = 'HANG_UPLOAD_STORE_FILE';
const SIGNING_CONFIGS = '    signingConfigs {\n';
const UPLOAD_CONFIG = `        upload {
            storeFile file(System.getenv('${STORE_FILE_ENV}') ?: 'missing-upload-keystore')
            storePassword System.getenv('HANG_UPLOAD_STORE_PASSWORD')
            keyAlias System.getenv('HANG_UPLOAD_KEY_ALIAS')
            keyPassword System.getenv('HANG_UPLOAD_KEY_PASSWORD')
        }
`;
const GENERATED_RELEASE_SIGNING = /(release \{\n(?:\s*\/\/.*\n)*\s*)signingConfig signingConfigs\.debug/;
const RELEASE_SIGNING = `signingConfig System.getenv('${STORE_FILE_ENV}') ? signingConfigs.upload : signingConfigs.debug`;

/** app/build.gradle with release builds signed by the upload key when one is given; the input is left as it was. */
function addReleaseSigning(buildGradle) {
  if (buildGradle.includes(UPLOAD_CONFIG)) return buildGradle;
  if (!buildGradle.includes(SIGNING_CONFIGS) || !GENERATED_RELEASE_SIGNING.test(buildGradle)) {
    throw new Error('withReleaseSigning: app/build.gradle has no generated signingConfigs or release signing line');
  }
  return buildGradle
    .replace(SIGNING_CONFIGS, `${SIGNING_CONFIGS}${UPLOAD_CONFIG}`)
    .replace(GENERATED_RELEASE_SIGNING, `$1${RELEASE_SIGNING}`);
}

function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => ({
    ...cfg,
    modResults: { ...cfg.modResults, contents: addReleaseSigning(cfg.modResults.contents) },
  }));
}

module.exports = withReleaseSigning;
module.exports.addReleaseSigning = addReleaseSigning;
