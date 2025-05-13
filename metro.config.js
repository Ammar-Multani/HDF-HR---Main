// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add additional module aliases if needed
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  // Ensure these modules can be resolved
  crypto: require.resolve("crypto-browserify"),
  stream: require.resolve("stream-browserify"),
};

// Make sure polyfills are included
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;
