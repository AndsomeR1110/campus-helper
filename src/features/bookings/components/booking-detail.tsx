"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyActionBar } from "@/components/layout";
import {
  Button,
  Card,
  ConfirmDialog,
  DemoDataNotice,
  StatusBadge,
  toast,
  TypeTag,
  useOffline,
} from "@/components/ui";
import { formatDateWithYear, formatTimeRange } from "@/lib/time";
import { BOOKING_TAGS } from "../constants";
import type { BookingItem } from "../types";
export function BookingDetail({ booking, now }: { booking: BookingItem; now: string }) {
  const router = useRouter();
  const offline = useOffline();
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState<string>();
  const canCancel =
    booking.status === "CONFIRMED" && Date.parse(booking.startsAt) > Date.parse(now);
  const time = `${formatDateWithYear(booking.startsAt)}, ${formatTimeRange(booking.startsAt, booking.endsAt)}`;
  async function cancel() {
    if (offline) {
      setFailure("Unavailable offline");
      throw new Error("offline");
    }
    setFailure(undefined);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(booking.id)}/cancel`, {
        method: "POST",
        cache: "no-store",
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(
          response.status >= 500
            ? "We couldn’t cancel this booking. Please try again."
            : (body.error?.message ?? "We couldn’t cancel this booking."),
        );
      }
      setOpen(false);
      toast.success("Booking cancelled");
      router.refresh();
    } catch (error) {
      setFailure(
        error instanceof TypeError
          ? "Check your connection and try again."
          : error instanceof Error
            ? error.message
            : "We couldn’t cancel this booking.",
      );
      throw error;
    }
  }
  return (
    <>
      <DemoDataNotice />
      <Card>
        <TypeTag type={BOOKING_TAGS[booking.kind]} />
        <h2 className="my-2 text-title">{booking.title}</h2>
        <StatusBadge kind="booking" status={booking.status} />
        <dl className="mt-4 flex flex-col gap-2">
          <dt className="text-body-sm text-text-muted">Time (Asia/Shanghai)</dt>
          <dd>{time}</dd>
          <dt className="text-body-sm text-text-muted">Location</dt>
          <dd>{booking.location ?? "Location not specified"}</dd>
        </dl>
      </Card>
      {!canCancel && (
        <p className="text-body-sm text-text-muted">
          Only confirmed bookings that have not started can be cancelled. Cancelled bookings stay in
          your history.
        </p>
      )}
      <StickyActionBar summary={time}>
        {offline && <p className="text-body-sm text-text-muted">Unavailable offline</p>}
        {failure && !open && (
          <p role="alert" className="text-body-sm text-danger">
            {failure}
          </p>
        )}
        <Button
          variant="secondary"
          size="lg"
          fullWidth
          disabled={!canCancel || offline}
          onClick={() => {
            setOpen(true);
            setFailure(undefined);
          }}
        >
          Cancel booking
        </Button>
      </StickyActionBar>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this booking?"
        description={
          <>
            {booking.title} · {time}. The place will become available to others. The record will be
            kept.
            {failure && (
              <span role="alert" className="mt-2 block text-danger">
                {failure}
              </span>
            )}
          </>
        }
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={cancel}
      />
    </>
  );
}
