const { getDefaultConfig } = require('expo/metro-config');
const { withMetroConfig } = require('react-native-reanimated/plugin');

const config = getDefaultConfig(__dirname);

module.exports = withMetroConfig(config);