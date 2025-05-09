// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional configuration for React Native Reanimated
config.resolver.sourceExts = [...config.resolver.sourceExts, 'mjs'];

module.exports = config;