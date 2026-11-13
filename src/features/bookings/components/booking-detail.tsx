"use client";
import { Clock, MapPin } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { StickyActionBar } from "@/components/layout";
import {
  Button,
  Card,
  ConfirmDialog,
  DateTile,
  DemoDataNotice,
  LocationText,
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
      <Card variant="widget" className="flex flex-col gap-4">
        <div className="flex items-start gap-3">
          <DateTile iso={booking.startsAt} type={BOOKING_TAGS[booking.kind]} size="lg" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <TypeTag type={BOOKING_TAGS[booking.kind]} />
            <h2 className="text-title">{booking.title}</h2>
            <StatusBadge kind="booking" status={booking.status} />
          </div>
        </div>
        <dl className="flex flex-col divide-y divide-liquid-edge rounded-md bg-surface-muted/60 px-4">
          <div className="flex items-center gap-3 py-3">
            <dt className="flex items-center gap-2 text-body-sm text-text-muted">
              <Clock className="size-4" aria-hidden />
              Time
            </dt>
            <dd className="ml-auto text-right text-body-sm tabular-nums">{time}</dd>
          </div>
          <div className="flex items-center gap-3 py-3">
            <dt className="flex items-center gap-2 text-body-sm text-text-muted">
              <MapPin className="size-4" aria-hidden />
              Location
            </dt>
            <dd className="ml-auto min-w-0 text-right text-body-sm">
              {booking.location ? (
                <LocationText
                  location={booking.location}
                  fallbackIcon={false}
                  wrap
                  className="justify-end text-right"
                />
              ) : (
                "Location not specified"
              )}
            </dd>
          </div>
        </dl>
        <p className="text-caption text-text-muted">Times shown in Asia/Shanghai.</p>
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
