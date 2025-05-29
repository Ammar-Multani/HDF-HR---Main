const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');
const { getDefaultConfig } = require('@expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensure web extensions come first
config.resolver.sourceExts = [
  'web.tsx', 'web.ts', 'web.jsx', 'web.js',
  'tsx', 'ts', 'jsx', 'js',
  'json', 'wasm',
];

// Add support for asset files
config.resolver.assetExts = [
  // Images
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg',
  // Fonts
  'ttf', 'otf', 'woff', 'woff2', 'eot',
  // Media
  'mp4', 'mp3', 'wav', 'webm',
  // Other
  'pdf', 'doc', 'docx'
];

config.transformer.getTransformOptions = async () => ({
  transform: {
    inlineRequires: true,
  },
});

module.exports = wrapWithReanimatedMetroConfig(config);