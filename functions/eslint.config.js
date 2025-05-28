import globals from "globals";
import tseslint from "typescript-eslint";

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {ignores: ["**/node_modules/**",'**/lib/**']},
  {languageOptions: { globals: globals.node }},
  ...tseslint.configs.recommended,
  {
    linterOptions: {
      reportUnusedDisableDirectives: "warn",
    },
    rules: {
      "no-debugger": "error",
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "eqeqeq": ["error", "always"],
      "no-else-return": "error",
    }
  }
];
