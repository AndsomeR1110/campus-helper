import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <>
      <TopBar title="My bookings" backHref="/profile" />
      <PageContainer>
        <Skeleton className="h-40" />
      </PageContainer>
    </>
  );
}
