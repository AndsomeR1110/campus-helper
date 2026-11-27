import { getTranslations } from "@/lib/i18n/server";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
export default async function Loading() {
  const t = await getTranslations();
  return (
    <>
      <TopBar title={t("Booking details")} backHref="/bookings" />
      <PageContainer width="content">
        <Skeleton className="h-40" />
      </PageContainer>
    </>
  );
}
