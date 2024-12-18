import globals from "globals";
import pluginJs from "@eslint/js";
import tseslint from "typescript-eslint";
import autoImports from "./.wxt/eslint-auto-imports.mjs";

/** @type {import('eslint').Linter.Config[]} */
export default [
  autoImports,
  { files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"] },
  { languageOptions: { globals: globals.browser } },
  pluginJs.configs.recommended,
  ...tseslint.configs.recommended,
];
