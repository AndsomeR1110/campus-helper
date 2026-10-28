import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { BottomNav } from "./bottom-nav";
import { NavItems } from "./nav-items";
import { NavigationTracker } from "./navigation-history";
import { SideNavItems } from "./side-nav";

export interface AppShellProps {
  children: ReactNode;
  /** Unread notification count for the Home tab badge (wired up by Member 4). */
  unreadCount?: number;
  /** Extra links for teachers / admins, shown at the bottom of the desktop SideNav. */
  roleLinks?: ReactNode;
}

/**
 * App frame for student pages (ui-ux-spec §3.2): BottomNav below 1024px,
 * a 240px SideNav from 1024px. Pages render their own TopBar.
 */
export function AppShell({ children, unreadCount, roleLinks }: AppShellProps) {
  return (
    <div className="flex min-h-full flex-1">
      <a
        href="#main"
        className="sr-only z-60 rounded-sm bg-surface px-4 py-2 text-primary shadow-overlay focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>

      <aside className="fixed inset-y-0 left-0 z-30 hidden w-side-nav flex-col border-r border-border bg-surface px-3 py-4 lg:flex">
        <Link href="/home" className="mb-6 flex items-center gap-2 px-3 py-2">
          <span
            aria-hidden
            className="flex size-8 items-center justify-center rounded-sm bg-primary text-subtitle text-on-primary"
          >
            C
          </span>
          <span className="text-subtitle tracking-wide">CAMPUS HELPER</span>
        </Link>
        <nav aria-label="Main">
          <Suspense fallback={<NavItems orientation="vertical" active={null} />}>
            <SideNavItems unreadCount={unreadCount} />
          </Suspense>
        </nav>
        {roleLinks && (
          <div className="mt-auto border-t border-border pt-4">
            <p className="px-3 pb-2 text-caption text-text-muted uppercase">Role tools</p>
            {roleLinks}
          </div>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-side-nav">
        <main id="main" className="flex flex-1 flex-col">
          {children}
        </main>
        {/* Hidden until the pathname is known, so detail pages never flash the bar. */}
        <Suspense fallback={null}>
          <BottomNav unreadCount={unreadCount} />
          <NavigationTracker />
        </Suspense>
      </div>
    </div>
  );
}
