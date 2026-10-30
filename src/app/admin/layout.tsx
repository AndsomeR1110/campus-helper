import type { ReactNode } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { requireAdmin } from "@/features/lost-found/server";

/**
 * Admin shell (PG-19). The ADMIN check runs here, on the server, before any
 * child page renders — the UI is never the only guard (CONTRIBUTING §6).
 * Replace `requireAdmin()` with `requireRole("ADMIN")` from `@/lib/auth` once
 * Member 2 lands `feat/auth-and-roles`.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  requireAdmin();

  return (
    <div className="min-h-dvh bg-surface-muted">
      <TopBar title="Administration" backHref="/home" variant="large" />
      <PageContainer width="content" className="pb-10">
        {children}
      </PageContainer>
    </div>
  );
}
