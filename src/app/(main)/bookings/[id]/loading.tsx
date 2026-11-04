import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
export default function Loading() {
  return (
    <>
      <TopBar title="Booking details" backHref="/bookings" />
      <PageContainer width="content">
        <Skeleton className="h-40" />
      </PageContainer>
    </>
  );
}
