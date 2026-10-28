import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Formatting is Prettier's job; turn off ESLint rules that conflict with it.
  prettier,
  {
    rules: {
      // Cross-module imports must go through the module's public index.ts
      // (docs/frontend-architecture.md §4).
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              // Allows "@/features/x" and "@/features/x/server", blocks anything deeper.
              regex: "^@/features/[^/]+/(?!server$).+",
              message:
                "Import from the module's public API ('@/features/<module>' or '@/features/<module>/server') instead.",
            },
          ],
        },
      ],
    },
  },
  {
    // Files inside a feature may import their own internals.
    files: ["src/features/**"],
    rules: { "no-restricted-imports": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
