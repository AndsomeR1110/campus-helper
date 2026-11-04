import { Suspense } from "react";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { PageContainer, TopBar } from "@/components/layout";
import { Skeleton } from "@/components/ui";
import { BookingDetail, UnavailableBooking } from "@/features/bookings";
import { bookingsService, BookingSourceUnavailable } from "@/features/bookings/server";
type Props = { params: Promise<{ id: string }> };
export default function BookingPage(props: Props) {
  return (
    <>
      <TopBar title="Booking details" backHref="/bookings" />
      <PageContainer width="content">
        <Suspense fallback={<Skeleton className="h-40" />}>
          <Detail {...props} />
        </Suspense>
      </PageContainer>
    </>
  );
}
async function Detail({ params }: Props) {
  await connection();
  let booking;
  try {
    booking = await bookingsService.detail((await params).id);
  } catch (error) {
    if (error instanceof BookingSourceUnavailable) return <UnavailableBooking />;
    throw error;
  }
  if (!booking) notFound();
  return <BookingDetail booking={booking} now={new Date().toISOString()} />;
}
