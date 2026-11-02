"use client";

import { usePathname } from "next/navigation";
import { getActiveTab } from "./nav-config";
import { NavItems } from "./nav-items";

/** Highlights the current tab. Wrapped in <Suspense> by AppShell because it reads the URL. */
export function SideNavItems({ unreadCount }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <NavItems orientation="vertical" active={getActiveTab(pathname)} unreadCount={unreadCount} />
  );
}
