import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <>
      <TopBar title="Study spaces" backHref="/services" />
      <PageContainer>
        <Skeleton className="h-40" />
      </PageContainer>
    </>
  );
}
