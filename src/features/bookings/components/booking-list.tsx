import { Card, DemoDataNotice, EmptyState, StatusBadge, TypeTag } from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import type { BookingItem } from "../types";

export function BookingList({ bookings }: { bookings: readonly BookingItem[] }) {
  return (
    <section className="mx-auto flex max-w-240 flex-col gap-6 p-4 md:p-6">
      <h1 className="text-title-lg">My bookings</h1>
      <DemoDataNotice />
      {bookings.length === 0 ? (
        <EmptyState
          title="No bookings yet"
          description="Find a study space or an Office Hour to get started."
        />
      ) : (
        bookings.map((booking) => (
          <Card key={booking.id}>
            <TypeTag type={booking.type === "STUDY_SPACE" ? "space" : "office"} />
            <h2 className="text-subtitle">
              <a href={booking.href} className="text-primary underline">
                {booking.title}
              </a>
            </h2>
            <p>
              {formatDate(booking.startsAt)}, {formatTimeRange(booking.startsAt, booking.endsAt)}
            </p>
            <p className="text-body-sm text-text-muted">{booking.location}</p>
            <StatusBadge kind="booking" status={booking.status} />
          </Card>
        ))
      )}
    </section>
  );
}
