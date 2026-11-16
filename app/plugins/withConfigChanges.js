// MainActivity handles these configuration changes itself instead of being recreated. On recreation the JS
// runtime survives and a second React root mounts before the first unmounts: the new root binds expo-router's
// global `router`, then the old root's cleanup unbinds it, and every `router.push` throws until Hang restarts
// (#65). React Native already follows font scale, density and locale at runtime; a bold-text change
// (fontWeightAdjustment) shows on the next launch. layoutDirection goes with locale: switching to a
// right-to-left language changes both. Kept as a config plugin so android/ stays generated.
const { withAndroidManifest } = require('expo/config-plugins');

const ACTIVITY = '.MainActivity';
const ATTRIBUTE = 'android:configChanges';
const SEPARATOR = '|';
const HANDLED_CHANGES = Object.freeze(['fontScale', 'density', 'locale', 'layoutDirection', 'fontWeightAdjustment']);

function withHandledChanges(configChanges) {
  const existing = configChanges ? configChanges.split(SEPARATOR) : [];
  const missing = HANDLED_CHANGES.filter((change) => !existing.includes(change));
  return [...existing, ...missing].join(SEPARATOR);
}

function isMainActivity(activity) {
  return activity.$['android:name'] === ACTIVITY;
}

function handleInActivity(activity) {
  return { ...activity, $: { ...activity.$, [ATTRIBUTE]: withHandledChanges(activity.$[ATTRIBUTE]) } };
}

/** The manifest with MainActivity handling HANDLED_CHANGES; the given one is left as it was. */
function handleConfigChanges(androidManifest) {
  const [application, ...otherApplications] = androidManifest.manifest.application ?? [];
  const activities = application?.activity ?? [];
  if (!activities.some(isMainActivity)) throw new Error(`withConfigChanges: no ${ACTIVITY} in AndroidManifest.xml`);
  const handled = activities.map((activity) => (isMainActivity(activity) ? handleInActivity(activity) : activity));
  const manifest = { ...androidManifest.manifest, application: [{ ...application, activity: handled }, ...otherApplications] };
  return { ...androidManifest, manifest };
}

function withConfigChanges(config) {
  return withAndroidManifest(config, (cfg) => ({ ...cfg, modResults: handleConfigChanges(cfg.modResults) }));
}

module.exports = withConfigChanges;
module.exports.handleConfigChanges = handleConfigChanges;
module.exports.HANDLED_CHANGES = HANDLED_CHANGES;
