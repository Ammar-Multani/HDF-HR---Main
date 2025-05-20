// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: ["eslint-config-expo"],
  ignores: [
    "dist/*",
    "node_modules/*",
    "build/*",
    "public/*",
    "kiki.config.ts",
    "metro.config.ts",
    "polyfills.js",
  ],
  rules: {
    // Add your custom rules here
    "react/react-in-jsx-scope": "off", // Not needed in React 17+
    "react-native/no-inline-styles": "warn",
    "no-unused-vars": [
      "warn",
      { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
    ],
  },
};
