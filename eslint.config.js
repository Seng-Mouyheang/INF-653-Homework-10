import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: { globals: globals.browser, sourceType: "module" },
  },
  { files: ["**/*.cjs"], languageOptions: { sourceType: "commonjs" } },
]);
