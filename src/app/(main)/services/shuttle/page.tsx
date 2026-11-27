import { Suspense } from "react";
import { redirect } from "next/navigation";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { getCurrentUser } from "@/lib/auth";
import { ShuttlePage } from "@/features/shuttle";
import { dayKey } from "@/lib/time";

async function Content() {
  if (!(await getCurrentUser())) redirect("/login?next=/services/shuttle");
  return <ShuttlePage initialDate={dayKey(new Date())} />;
}
export default function Page() {
  return (
    <>
      <TopBar title="Shuttle bus" backHref="/services" />
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Content />
        </Suspense>
      </PageContainer>
    </>
  );
}
