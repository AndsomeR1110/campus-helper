import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageContainer, TopBar } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";
import { ShuttlePage, ShuttleSkeleton } from "@/features/shuttle";
import { dayKey } from "@/lib/time";

export const metadata: Metadata = { title: "Shuttle bus" };

async function Content() {
  if (!(await getCurrentUser())) redirect("/login?next=/services/shuttle");
  return <ShuttlePage initialDate={dayKey(new Date())} />;
}
export default function Page() {
  return (
    <>
      <TopBar title="Shuttle bus" backHref="/services" />
      <PageContainer>
        <Suspense fallback={<ShuttleSkeleton />}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
