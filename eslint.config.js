import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

export default [
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "coverage/**",
      "video-ai/**",
      "public/pdf.worker*",
    ],
  },
  js.configs.recommended,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2023,
      },
    },
    rules: {
      // Bug real: variável/import não usado costuma ser typo ou código morto.
      "no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "no-empty": ["warn", { allowEmptyCatch: true }],
      // Regex com caractere de controle é intencional (higienização de texto).
      "no-control-regex": "off",
    },
  },
  // Frontend React
  {
    files: ["src/**/*.{js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      globals: { ...globals.browser, ...globals.es2023 },
    },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.flat.recommended.rules,
      ...react.configs.flat["jsx-runtime"].rules,
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.flatConfigs.recommended.rules,
      // Este projeto não usa prop-types nem React import (jsx-runtime).
      "react/prop-types": "off",
      "react/no-unescaped-entities": "warn",
      // Regra CRÍTICA (mantida como erro, trava o build): hooks só no topo,
      // nunca depois de um return condicional — a classe de bug que já mordeu
      // aqui. Hoje há zero violações; fica de guarda para o futuro.
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      // Regras novas do React Compiler (opinativas): mantidas como aviso.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      // a11y como AVISO: aponta problemas de acessibilidade para melhora
      // gradual, sem travar o build.
      "jsx-a11y/no-autofocus": "off",
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
    },
  },
  // Service worker
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: { ...globals.serviceworker, ...globals.browser },
    },
  },
];
