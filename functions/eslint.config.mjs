import globals from "globals";
import tseslint from "typescript-eslint";
import pluginPromise from "eslint-plugin-promise";
import pluginImport from "eslint-plugin-import";
import pluginNode from "eslint-plugin-node";
import pluginSecurity from "eslint-plugin-security";

import { FlatCompat } from "@eslint/eslintrc";
import path from "path";
import { fileURLToPath } from "url";

// mimic CommonJS variables -- not needed if using CommonJS
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

/** @type {import('eslint').Linter.Config[]} */
export default [
  {files: ["**/*.{js,mjs,cjs,ts}"]},
  {ignores: ["**/node_modules/**",'**/lib/**']},
  {languageOptions: { globals: globals.node }}, // Changed to node for Firebase Functions
  ...compat.extends(
    tseslint.configs.recommended,
    pluginPromise.configs.recommended,
    pluginImport.configs.recommended,
    pluginNode.configs.recommended,
    pluginSecurity.configs.recommended
  ),
  {
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "warn",
    },
    rules: {
      // General best practices
      "no-console": "warn", // Warn about console.log in production
      "no-debugger": "error", // Disallow debugger statements
      "no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }], // Warn on unused variables, ignore args starting with _
      "eqeqeq": ["error", "always"], // Require === and !==
      "no-else-return": "error", // Disallow else after a return in if

      // TypeScript specific rules (from @typescript-eslint/eslint-plugin)
      "@typescript-eslint/explicit-module-boundary-types": "off", // Allow implicit return types for functions
      "@typescript-eslint/no-explicit-any": "off", // Allow 'any' type
      "@typescript-eslint/no-non-null-assertion": "off", // Allow non-null assertions
      "@typescript-eslint/no-floating-promises": "error", // Require handling of floating promises
      "@typescript-eslint/no-misused-promises": "error", // Prevent promises from being used in places where they are not expected
      "@typescript-eslint/restrict-template-expressions": ["error", { "allowNumber": true, "allowBoolean": true }], // Enforce template literal expressions to be of string type
      "@typescript-eslint/no-unsafe-assignment": "off", // Allow unsafe assignments (can be too strict)
      "@typescript-eslint/no-unsafe-call": "off", // Allow unsafe calls
      "@typescript-eslint/no-unsafe-member-access": "off", // Allow unsafe member access
      "@typescript-eslint/no-unsafe-return": "off", // Allow unsafe returns

      // Promise plugin rules
      "promise/always-return": "error",
      "promise/no-return-wrap": "error",
      "promise/param-names": "error",
      "promise/catch-or-return": "error",
      "promise/no-nesting": "warn",
      "promise/no-promise-in-callback": "warn",
      "promise/no-callback-in-promise": "warn",
      "promise/avoid-new": "off", // Allow new Promise
      "promise/no-new-statics": "error",
      "promise/no-return-in-finally": "warn",
      "promise/valid-params": "warn",

      // Import plugin rules
      "import/no-unresolved": "error", // Ensure imports resolve to a file/module
      "import/named": "error", // Verify named imports exist
      "import/namespace": "error", // Verify all exports are named
      "import/default": "error", // Verify default export exists
      "import/export": "error", // No duplicate exports
      "import/order": ["warn", { "newlines-between": "always" }], // Enforce a consistent ordering of imports
      "import/no-duplicates": "error", // Report repeated import of the same module
      "import/no-extraneous-dependencies": ["error", {"devDependencies": false, "optionalDependencies": false, "peerDependencies": false}], // Prevent importing packages not in package.json

      // Node plugin rules
      "node/no-deprecated-api": "error", // Disallow deprecated APIs
      "node/no-missing-import": "off", // Handled by import/no-unresolved
      "node/no-missing-require": "off", // Handled by import/no-unresolved
      "node/no-unpublished-import": "off", // Handled by import/no-extraneous-dependencies
      "node/no-unpublished-require": "off", // Handled by import/no-extraneous-dependencies
      "node/process-exit-as-throw": "error", // Require process.exit() to be used with throw
      "node/shebang": "off", // Not relevant for Firebase Functions

      // Security plugin rules
      "security/detect-buffer-noassert": "warn",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "warn",
      "security/detect-eval-with-expression": "error",
      "security/detect-new-buffer": "warn",
      "security/detect-no-csrf-before-method-override": "warn",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-object-injection": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "warn",
      "security/detect-unsafe-regex": "warn"
    }
  }
];
