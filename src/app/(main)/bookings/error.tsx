"use client";
import { useTranslations } from "@/lib/i18n/client";
import { PageContainer, TopBar } from "@/components/layout";
import { ErrorState } from "@/components/ui";
export default function Error({ retry }: { retry: () => void }) {
  const t = useTranslations();
  return (
    <>
      <TopBar title={t("My bookings")} backHref="/profile" />
      <PageContainer>
        <ErrorState onRetry={retry} />
      </PageContainer>
    </>
  );
}
