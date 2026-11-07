import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    // `server-only` is not a dependency of this project: Next.js aliases it to its own
    // compiled stub at build time. Vitest has no such alias, so any test that imports a
    // server module (e.g. the real-PostgreSQL tests) would fail to resolve it.
    alias: { "server-only": "next/dist/compiled/server-only/empty.js" },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}", "board/**/*.test.js"],
    setupFiles: ["./vitest.setup.ts"],
  },
});
