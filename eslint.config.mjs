export default [
  {
    ignores: ["dist/**", "node_modules/**"],
  },
  {
    files: ["**/*.{js,jsx,mjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: Object.fromEntries(
        [
          "window",
        "fetch",
          "document",
          "navigator",
          "localStorage",
          "crypto",
          "URL",
          "Blob",
          "FileReader",
          "HTMLElement",
          "setTimeout",
          "clearTimeout",
          "console",
          "process",
          "structuredClone",
        ].map((name) => [name, "readonly"]),
      ),
    },
    rules: {
      "no-undef": "error",
      "no-unreachable": "error",
      "no-constant-condition": ["error", { checkLoops: false }],
      "no-dupe-keys": "error",
      "no-duplicate-case": "error",
      "valid-typeof": "error",
      eqeqeq: ["error", "always"],
    },
  },
];
