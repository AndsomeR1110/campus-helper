import { getTranslations } from "@/lib/i18n/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { BookingList } from "@/features/bookings";
import { bookingsService } from "@/features/bookings/server";
type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
export default async function BookingsPage(props: Props) {
  const t = await getTranslations();
  return (
    <>
      <TopBar title={t("My bookings")} backHref="/profile" />
      <PageContainer>
        <Suspense fallback={<Skeleton className="h-40" />}>
          <BookingsContent {...props} />
        </Suspense>
      </PageContainer>
    </>
  );
}
async function BookingsContent({ searchParams }: Props) {
  const { type } = await searchParams;
  return (
    <BookingList
      filter={type === "office" || type === "space" ? type : "all"}
      result={await bookingsService.listMine()}
    />
  );
}
