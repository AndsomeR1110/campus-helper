import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense, type ReactNode } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice, Skeleton } from "@/components/ui";
import { getCurrentAdmin } from "@/features/lost-found/server";
import { getModerationRuntime } from "@/features/admin/server";

export const metadata: Metadata = { title: "Administration" };

/**
 * PG-19 shell. The gate is here and in every service call: `getCurrentAdmin()`
 * returns null unless the signed-in user is an ADMIN, so a normal visitor gets a 404
 * instead of a page they cannot use.
 */
/** Reads the session, so it renders per request inside <Suspense>. */
async function AdminGate({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) notFound();

  const { demo } = getModerationRuntime();

  return (
    <>
      {demo ? <DemoDataNotice variant="banner" /> : null}
      {children}
    </>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <TopBar title="Administration" variant="large" />
      <PageContainer width="content" className="flex flex-col gap-4 py-4">
        <Suspense fallback={<Skeleton className="h-40 w-full" aria-hidden />}>
          <AdminGate>{children}</AdminGate>
        </Suspense>
      </PageContainer>
    </div>
  );
}
