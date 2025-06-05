module.exports = {
  env: {
    es6: true,
    node: true,
  },
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
  },
  rules: {
    quotes: ["error", "double"],
    "object-curly-spacing": ["error", "always"],
    "max-len": ["error", { code: 120 }],
    "require-jsdoc": "off",
  },
};
