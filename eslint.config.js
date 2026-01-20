const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  { ignores: ["eslint.config.js"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...globals.jquery,
        bootstrap: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["error", { "argsIgnorePattern": "^_", "varsIgnorePattern": "^_" }],
    },
  },
  {
    files: ["tests/**/*.js", "playwright.config.js"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
