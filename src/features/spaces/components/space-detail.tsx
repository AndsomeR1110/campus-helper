"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  StatusBadge,
  toast,
  useOffline,
} from "@/components/ui";
import { formatDate, formatTimeRange } from "@/lib/time";
import { requestSpaceBooking } from "../client";
import type { Space, SpaceBooking, TimeRange } from "../types";
import { SpaceFilterForm } from "./space-filter-form";
import { SpacePicker } from "./space-picker";

export function SpaceDetail({
  space,
  range,
  query,
  error,
  bookings,
  now,
}: {
  space: Space & { available: boolean };
  range?: TimeRange;
  query: string;
  error?: string;
  bookings: SpaceBooking[];
  now: string;
}) {
  const router = useRouter();
  return (
    <>
      <p className="text-body-sm text-text-muted">
        Shared demo account: Mia Chen. Bookings are not private until sign-in is connected.
      </p>
      {range ? (
        <SpacePicker
          key={query}
          spaces={[space]}
          range={range}
          query={query}
          filterAction={`/spaces/${encodeURIComponent(space.id)}`}
          onRetry={() => router.refresh()}
          onBook={async (id, time) => {
            await requestSpaceBooking("/api/space-bookings", { spaceId: id, ...time });
            toast.success("Booking confirmed");
            router.refresh();
          }}
        >
          <SeatBookings bookings={bookings} now={now} />
        </SpacePicker>
      ) : (
        <>
          <SpaceFilterForm query={query} action={`/spaces/${encodeURIComponent(space.id)}`} />
          <p role="alert" className="text-body-sm text-danger">
            {error}
          </p>
          <SeatBookings bookings={bookings} now={now} />
        </>
      )}
    </>
  );
}
function SeatBookings({ bookings, now }: { bookings: SpaceBooking[]; now: string }) {
  const router = useRouter();
  const offline = useOffline();
  const [selected, setSelected] = useState<SpaceBooking>();
  const [failure, setFailure] = useState<string>();
  return (
    <section className="flex flex-col gap-3" aria-label="Your bookings for this seat">
      <h2 className="text-title">Your bookings for this seat</h2>
      {bookings.length === 0 ? (
        <EmptyState title="No bookings for this seat" />
      ) : (
        bookings.map((b) => (
          <Card key={b.id}>
            <p>
              {formatDate(b.startsAt)}, {formatTimeRange(b.startsAt, b.endsAt)}
            </p>
            <StatusBadge kind="booking" status={b.status} />
            {b.status === "CONFIRMED" && Date.parse(b.startsAt) > Date.parse(now) && (
              <Button
                variant="secondary"
                disabled={offline}
                onClick={() => {
                  setSelected(b);
                  setFailure(undefined);
                }}
              >
                Cancel booking
              </Button>
            )}
          </Card>
        ))
      )}
      {offline && <p className="text-body-sm text-text-muted">Unavailable offline</p>}
      {failure && (
        <p role="alert" className="text-body-sm text-danger">
          {failure}
        </p>
      )}
      <ConfirmDialog
        open={!!selected}
        onClose={() => setSelected(undefined)}
        title="Cancel this booking?"
        description="The seat will become available for this time. The cancelled record will be kept."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={async () => {
          if (!selected) return;
          if (offline) {
            setFailure("Unavailable offline");
            throw new Error("offline");
          }
          try {
            await requestSpaceBooking(
              `/api/space-bookings/${encodeURIComponent(selected.id)}/cancel`,
            );
            setSelected(undefined);
            toast.success("Booking cancelled");
            router.refresh();
          } catch (error) {
            setFailure(
              error instanceof Error
                ? error.message
                : "We couldn’t cancel this booking. Please try again.",
            );
            throw error;
          }
        }}
      />
    </section>
  );
}
