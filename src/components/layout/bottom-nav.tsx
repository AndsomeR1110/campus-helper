"use client";

import { usePathname } from "next/navigation";
import { getActiveTab, shouldShowBottomNav } from "./nav-config";
import { NavItems } from "./nav-items";

/**
 * Phone and tablet tab bar (ui-ux-spec §4.12). Hidden from 1024px, where
 * SideNav takes over, and on detail / form pages.
 * Uses usePathname, so AppShell wraps it in <Suspense>.
 */
export function BottomNav({ unreadCount }: { unreadCount?: number }) {
  const pathname = usePathname();
  if (!shouldShowBottomNav(pathname)) return null;

  return (
    <>
      {/* Reserves space so the fixed bar never covers page content. */}
      <div
        aria-hidden
        className="h-[calc(var(--spacing-bottom-nav)+env(safe-area-inset-bottom))] lg:hidden"
      />
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] lg:hidden"
      >
        <div className="mx-auto h-bottom-nav max-w-list">
          <NavItems
            orientation="horizontal"
            active={getActiveTab(pathname)}
            unreadCount={unreadCount}
          />
        </div>
      </nav>
    </>
  );
}
