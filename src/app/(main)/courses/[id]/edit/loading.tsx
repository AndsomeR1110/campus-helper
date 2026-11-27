import { getTranslations } from "@/lib/i18n/server";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";

/** Required for every dynamic route (architecture §5.1). */
export default async function Loading() {
  const t = await getTranslations();
  return (
    <>
      <TopBar title={t("Edit course")} backHref="/courses" />
      <PageContainer width="content">
        <Skeleton className="h-64 w-full" aria-hidden />
      </PageContainer>
    </>
  );
}
