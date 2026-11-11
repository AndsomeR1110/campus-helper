import Link from "next/link";
import { roleToolsFor, type UserRole } from "./nav-config";

/** "Role tools" block for the desktop SideNav. Renders nothing for students. */
export function SideNavRoleTools({ role }: { role: UserRole | null | undefined }) {
  const tools = roleToolsFor(role);
  if (tools.length === 0) return null;
  return (
    <nav aria-label="Role tools" className="border-t border-border pt-4">
      <p className="px-3 pb-2 text-caption tracking-wide text-text-muted uppercase">Role tools</p>
      <ul className="flex flex-col gap-1">
        {tools.map(({ label, href, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex h-11 items-center gap-3 rounded-full px-4 text-body font-medium text-text-muted transition-colors duration-150 hover:bg-surface-muted hover:text-text"
            >
              <Icon className="size-5" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
