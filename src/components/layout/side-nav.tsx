"use client";

import { usePathname } from "next/navigation";
import { getActiveTab, isRoleToolRoute } from "./nav-config";
import { NavItems } from "./nav-items";

/** Highlights the current tab. Wrapped in <Suspense> by AppShell because it reads the URL. */
export function SideNavItems({ unreadCount }: { unreadCount?: number }) {
  const pathname = usePathname();
  return (
    <NavItems
      orientation="vertical"
      active={isRoleToolRoute(pathname) ? null : getActiveTab(pathname)}
      unreadCount={unreadCount}
    />
  );
}
