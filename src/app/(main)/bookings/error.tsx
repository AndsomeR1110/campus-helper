"use client";
import { PageContainer, TopBar } from "@/components/layout";
import { ErrorState } from "@/components/ui";
export default function Error({ retry }: { retry: () => void }) {
  return (
    <>
      <TopBar title="My bookings" backHref="/profile" />
      <PageContainer>
        <ErrorState onRetry={retry} />
      </PageContainer>
    </>
  );
}
