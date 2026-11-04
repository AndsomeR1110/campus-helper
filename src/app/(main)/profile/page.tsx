import { Bell, ChevronRight, ClipboardList, LogIn, Megaphone, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { PageContainer, ROLE_LABELS, TopBar, roleToolsFor } from "@/components/layout";
import { InstallAppCard } from "@/components/pwa";
import { DemoDataNotice, Skeleton, buttonStyles } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "./logout-button";

export const metadata: Metadata = { title: "Profile" };

function MenuLink({
  href,
  icon: Icon,
  children,
}: {
  href: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-13 items-center gap-3 px-4 transition-colors duration-150 hover:bg-surface-muted"
      >
        <Icon className="size-5 text-text-muted" aria-hidden />
        <span className="flex-1 text-body">{children}</span>
        <ChevronRight className="size-5 text-text-muted" aria-hidden />
      </Link>
    </li>
  );
}

function MenuGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-caption tracking-wide text-text-muted uppercase">{label}</h2>
      <ul className="divide-y divide-border overflow-hidden rounded-md border border-border bg-surface shadow-card">
        {children}
      </ul>
    </section>
  );
}

const cardClasses =
  "flex items-center gap-4 rounded-md border border-border bg-surface p-4 shadow-card";

function AccountSkeleton() {
  return (
    <div className={cardClasses} aria-hidden>
      <Skeleton className="size-14 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48" />
      </div>
    </div>
  );
}

/**
 * Account card, role tools and log out. Reads the session, so it renders per
 * request inside <Suspense>. The proxy already sends signed-out visitors to
 * /login; the signed-out card covers an invalid session reaching the page.
 */
async function Account() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className={cardClasses}>
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-title text-primary"
        >
          ?
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-subtitle">You’re not signed in</p>
          <p className="text-body-sm text-text-muted">Sign in to see your bookings and posts.</p>
        </div>
        <Link href="/login?next=/profile" className={buttonStyles({ size: "sm" })}>
          <LogIn />
          Log in
        </Link>
      </section>
    );
  }

  const tools = roleToolsFor(user.role);
  return (
    <>
      <section className={cardClasses} aria-label="Your account">
        <span
          aria-hidden
          className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-subtle text-title text-primary"
        >
          {user.name.trim().charAt(0).toUpperCase() || "?"}
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="truncate text-subtitle">{user.name}</p>
          <p className="truncate text-body-sm text-text-muted">{user.email}</p>
        </div>
        <span className="inline-flex h-6 shrink-0 items-center rounded-full bg-primary-subtle px-2.5 text-caption text-primary">
          {ROLE_LABELS[user.role]}
        </span>
      </section>

      {tools.length > 0 && (
        <MenuGroup label="Role tools">
          {tools.map((tool) => (
            <MenuLink key={tool.href} href={tool.href} icon={tool.icon}>
              {tool.label}
            </MenuLink>
          ))}
        </MenuGroup>
      )}
    </>
  );
}

async function AccountActions() {
  const user = await getCurrentUser();
  if (!user) return null;
  return (
    <div className="flex flex-col gap-2">
      <LogoutButton />
    </div>
  );
}

// PG-18
export default function ProfilePage() {
  return (
    <>
      <TopBar title="Profile" variant="large" />
      <PageContainer width="content">
        <Suspense fallback={<AccountSkeleton />}>
          <Account />
        </Suspense>

        <MenuGroup label="My activity">
          <MenuLink href="/bookings" icon={ClipboardList}>
            My bookings
          </MenuLink>
          <MenuLink href="/my/posts" icon={Megaphone}>
            My posts
          </MenuLink>
          <MenuLink href="/notifications" icon={Bell}>
            Notifications
          </MenuLink>
        </MenuGroup>

        <InstallAppCard />

        <Suspense fallback={null}>
          <AccountActions />
        </Suspense>

        <DemoDataNotice variant="footer" className="mt-4" />
      </PageContainer>
    </>
  );
}
