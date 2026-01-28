import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import astro from "eslint-plugin-astro";
import jsonc from "eslint-plugin-jsonc";
import globals from "globals";

export default tseslint.config(
  // Base ESLint recommended
  eslint.configs.recommended,

  // TypeScript
  ...tseslint.configs.recommended,

  // Astro
  ...astro.configs.recommended,

  // JSON
  ...jsonc.configs["flat/recommended-with-jsonc"],

  // Global settings for all files
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
  },

  // TypeScript/JavaScript specific rules
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-empty-object-type": "off",
      "prefer-const": "error",
    },
  },

  // Astro specific rules
  {
    files: ["**/*.astro"],
    rules: {
      // Astro frontmatter variables are used in template
      "@typescript-eslint/no-unused-vars": "off",
    },
  },

  // JSON specific rules
  {
    files: ["**/*.json", "**/*.jsonc"],
    rules: {
      "jsonc/indent": ["error", 2],
    },
  },

  // Ignore patterns
  {
    ignores: ["node_modules/**", "out/**", "dist/**", ".astro/**", "*.min.js"],
  }
);
