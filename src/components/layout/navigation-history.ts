"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

// Counts client-side navigations since the app loaded, so the back button
// knows whether router.back() stays inside the app.
let navigations = 0;
let lastPathname: string | null = null;

export function hasInAppHistory() {
  return navigations > 0;
}

/** Mounted once in AppShell. Renders nothing. */
export function NavigationTracker() {
  const pathname = usePathname();
  useEffect(() => {
    if (lastPathname !== null && lastPathname !== pathname) navigations += 1;
    lastPathname = pathname;
  }, [pathname]);
  return null;
}
