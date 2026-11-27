// Release builds are numbered by CI: HANG_VERSION_CODE is the commit count on main, so the number on the phone
// names its commit and never goes backwards (#25). Local and E2E builds leave it unset and keep app.json's version.
const ENV_KEY = 'HANG_VERSION_CODE';
const MAJOR_MINOR = '1.0';
// Play's ceiling for versionCode.
const MAX_VERSION_CODE = 2100000000;
const WHOLE_NUMBER = /^\d+$/;

function parseVersionCode(raw) {
  const code = WHOLE_NUMBER.test(raw) ? Number(raw) : NaN;
  if (!(code >= 1 && code <= MAX_VERSION_CODE)) {
    throw new Error(`${ENV_KEY} must be a whole number from 1 to ${MAX_VERSION_CODE}, got "${raw}"`);
  }
  return code;
}

/** The Expo config numbered from env[HANG_VERSION_CODE]; unchanged when it isn't set. */
function withReleaseVersion(config, env) {
  const raw = env[ENV_KEY];
  if (raw === undefined) return config;
  const versionCode = parseVersionCode(raw);
  return { ...config, version: `${MAJOR_MINOR}.${versionCode}`, android: { ...config.android, versionCode } };
}

module.exports = { withReleaseVersion };
