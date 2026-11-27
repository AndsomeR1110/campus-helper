import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageContainer, TopBar } from "@/components/layout";
import { getCurrentUser } from "@/lib/auth";
import { ShuttlePage, ShuttleSkeleton } from "@/features/shuttle";
import { dayKey } from "@/lib/time";

export const metadata: Metadata = { title: "Shuttle bus" };

async function Content() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/services/shuttle");
  return <ShuttlePage key={user.id} actorId={user.id} initialDate={dayKey(new Date())} />;
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
