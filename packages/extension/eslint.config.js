import globals from "globals";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginImport from "eslint-plugin-import";
import pluginPrettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";
import tseslint from "typescript-eslint"; // Import the TypeScript ESLint plugin

export default [
  {
    ignores: ["*.json", "*.config.ts", "*.config.js", ".output/**/*", ".wxt/**/*"],
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"], // Ensure .ts and .tsx are included here
    languageOptions: {
      parser: tseslint.parser, // Set the TypeScript parser
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
        tsconfigRootDir: import.meta.dirname,
        project: "./tsconfig.json", // Important: Point to your tsconfig.json
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin, // Add the TypeScript plugin
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      import: pluginImport,
      prettier: pluginPrettier,
    },
    rules: {
      ...pluginReact.configs.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      ...configPrettier.rules,
      ...tseslint.configs.recommended.rules, // Add recommended TypeScript rules
      ...tseslint.configs.stylistic.rules, // Add stylistic TypeScript rules (optional, but often useful)
      "prettier/prettier": "error",

      "react/react-in-jsx-scope": "off",

      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],

      "import/order": [
        "error",
        {
          "newlines-between": "never",
          alphabetize: {
            order: "asc",
            caseInsensitive: true,
          },
        },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      "react/display-name": "off",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
];
