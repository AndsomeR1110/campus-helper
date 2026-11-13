"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { roleToolsFor, type UserRole } from "./nav-config";

/**
 * "Role tools" block for the desktop SideNav. Renders nothing for students.
 * Uses usePathname to highlight the current tool, so render it inside <Suspense>.
 */
export function SideNavRoleTools({ role }: { role: UserRole | null | undefined }) {
  const pathname = usePathname();
  const tools = roleToolsFor(role);
  if (tools.length === 0) return null;
  return (
    <nav aria-label="Role tools" className="border-t border-border pt-4">
      <p className="px-3 pb-2 text-caption tracking-wide text-text-muted uppercase">Role tools</p>
      <ul className="flex flex-col gap-1">
        {tools.map(({ label, href, icon: Icon }) => {
          const section = `/${href.split("/")[1]}`;
          const current = pathname === section || pathname.startsWith(`${section}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={cn(
                  "flex h-11 items-center gap-3 rounded-full px-4 text-body font-medium transition-colors duration-150",
                  current
                    ? "bg-primary-subtle text-primary"
                    : "text-text-muted hover:bg-surface-muted hover:text-text",
                )}
              >
                <Icon className="size-5" strokeWidth={current ? 2.25 : 1.75} aria-hidden />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
