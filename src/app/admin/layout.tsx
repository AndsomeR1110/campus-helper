import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import { DemoDataNotice } from "@/components/ui";
import { getCurrentAdmin } from "@/features/lost-found/server";
import { getModerationRuntime } from "@/features/admin/server";

export const metadata: Metadata = { title: "Administration" };

/**
 * PG-19 shell. The gate is here and in every service call: `getCurrentAdmin()`
 * returns null unless `LOST_FOUND_DEMO_ADMIN=1`, so a normal visitor gets a 404
 * instead of a page they cannot use.
 */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getCurrentAdmin();
  if (!admin) notFound();

  const { demo } = getModerationRuntime();

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted">
      <TopBar title="Administration" variant="large" />
      <PageContainer width="content" className="flex flex-col gap-4 py-4">
        {demo ? <DemoDataNotice variant="banner" /> : null}
        {children}
      </PageContainer>
    </div>
  );
}
