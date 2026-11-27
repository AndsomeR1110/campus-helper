"use client";
import { useTranslations } from "@/lib/i18n/client";
import { PageContainer, TopBar } from "@/components/layout";
import { ErrorState } from "@/components/ui";
export default function SpaceError({ retry }: { retry: () => void }) {
  const t = useTranslations();
  return (
    <>
      <TopBar title={t("Study spaces")} backHref="/services" />
      <PageContainer>
        <ErrorState onRetry={retry} />
      </PageContainer>
    </>
  );
}
