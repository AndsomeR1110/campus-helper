"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js (FR-PWA-02). Production only: in development a
 * caching service worker hides code changes and makes debugging confusing.
 * Mounted once in the root layout; renders nothing.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch((error) => console.error("[pwa] service worker registration failed", error));
  }, []);

  return null;
}
