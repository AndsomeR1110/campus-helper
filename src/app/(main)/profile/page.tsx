import { Bell, ChevronRight, ClipboardList, LogIn, Megaphone, type LucideIcon } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice, buttonStyles } from "@/components/ui";

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

// PG-18. Account details, role tools (teacher / admin) and Log out need auth
// (Member 2, feat/auth-and-roles); until then the page shows the signed-out state.
export default function ProfilePage() {
  return (
    <>
      <TopBar title="Profile" variant="large" />
      <PageContainer width="content">
        <section className="flex items-center gap-4 rounded-md border border-border bg-surface p-4 shadow-card">
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
          <Link href="/login" className={buttonStyles({ size: "sm" })}>
            <LogIn />
            Log in
          </Link>
        </section>

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

        <DemoDataNotice variant="footer" className="mt-4" />
      </PageContainer>
    </>
  );
}
