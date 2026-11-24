import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // `any` is used widely in existing app code (mostly Supabase query
    // results). Surface it as a warning so new code gets nudged toward real
    // types without blocking CI on the existing backlog.
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
    },
  },
  {
    // Test mocks and one-off scripts legitimately use loose types.
    files: ["tests/**", "scripts/**", "**/*.test.ts", "**/*.test.tsx"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
]);

export default eslintConfig;
