import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";

/** Required for every dynamic route (architecture §5.1). */
export default function Loading() {
  return (
    <>
      <TopBar title="Edit course" backHref="/courses" />
      <PageContainer width="content">
        <Skeleton className="h-64 w-full" aria-hidden />
      </PageContainer>
    </>
  );
}
