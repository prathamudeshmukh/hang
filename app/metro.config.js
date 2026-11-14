const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.sourceExts.push('sql');
// Dependency-free code shared with the Edge Functions and scripts (#19: linkKey). Only this folder, not all of supabase/.
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../supabase/functions/_shared/links')];

module.exports = config;
