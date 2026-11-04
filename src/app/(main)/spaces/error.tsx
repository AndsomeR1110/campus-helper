"use client";
import { PageContainer, TopBar } from "@/components/layout";
import { ErrorState } from "@/components/ui";
export default function SpaceError({ retry }: { retry: () => void }) {
  return (
    <>
      <TopBar title="Study spaces" backHref="/services" />
      <PageContainer>
        <ErrorState onRetry={retry} />
      </PageContainer>
    </>
  );
}
