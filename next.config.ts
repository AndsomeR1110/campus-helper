import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emits .next/standalone for the production server (issue #32). Local
  // `next build` + `next start` keep working; next start just prints an
  // info-level note about the standalone output.
  output: "standalone",
  // Recommended by Prisma docs for Next.js: load the client (with its
  // platform-specific query engine) via a plain runtime require instead of
  // bundling it. Note Turbopack still references the client by a content
  // hash in standalone chunks — the deploy script creates a matching
  // symlink in node_modules/@prisma (see deploy notes on issue #32).
  serverExternalPackages: ["@prisma/client"],
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Detects lost connectivity, retries failed navigations / prefetches once the
    // network returns and powers `useOffline()` (OfflineBanner, PWA-AC-03/04).
    useOffline: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
      {
        // Browsers must always fetch the latest service worker.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
