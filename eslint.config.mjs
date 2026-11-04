import js from "@eslint/js";
import globals from "globals";
import tseslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import reactPlugin from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11yPlugin from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import nextPlugin from "@next/eslint-plugin-next";

const tsFiles = ["**/*.{ts,tsx}"];

export default [
  js.configs.recommended,
  {
    files: tsFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
      globals: { ...globals.browser, ...globals.node },
    },
    plugins: {
      "@typescript-eslint": tseslintPlugin,
      react: reactPlugin,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11yPlugin,
      import: importPlugin,
      "@next/next": nextPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      ...(reactPlugin.configs.recommended?.rules ?? {}),
      ...(reactHooks.configs.recommended?.rules ?? {}),
      "@typescript-eslint/no-explicit-any": "warn",
      "react/react-in-jsx-scope": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { args: "none", argsIgnorePattern: "^_" }],
      "react/no-unescaped-entities": "off",
      "@next/next/no-html-link-for-pages": "warn",
      "@next/next/no-sync-scripts": "warn",
    },
  },
  {
    files: ["tests/e2e/**/*.{ts,tsx}"],
    languageOptions: { globals: { ...globals.browser, ...globals.node, ...globals.playwright } },
  },
  {
    files: ["tests/**/*.test.ts"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
  },
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      ".open-next/**",
      ".wrangler/**",
      "dist/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
      ".data/**",
      ".output/**",
    ],
  },
];
