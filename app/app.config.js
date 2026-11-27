// app.json holds the config; this only numbers CI's release builds (HANG_VERSION_CODE, #25).
const { withReleaseVersion } = require('./plugins/releaseVersion.js');

module.exports = ({ config }) => withReleaseVersion(config, process.env);
