"use client";

import { useState } from "react";
import { Button, ConfirmDialog, ErrorState } from "@/components/ui";
import { BookingList } from "./booking-list";
import type { BookingItem } from "../types";

export function BookingDetail({
  booking,
  now,
  onCancel,
}: {
  booking: BookingItem;
  now: string;
  onCancel: (booking: BookingItem) => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [failure, setFailure] = useState(false);
  const canCancel =
    booking.status === "CONFIRMED" && Date.parse(booking.startsAt) > Date.parse(now);
  return (
    <>
      <BookingList bookings={[booking]} />
      <div className="mx-auto max-w-160 p-4">
        {failure && (
          <ErrorState description="We couldn’t cancel this booking. Try again. Your booking is unchanged until cancellation is confirmed." />
        )}
        <Button variant="secondary" disabled={!canCancel} onClick={() => setOpen(true)}>
          Cancel booking
        </Button>
      </div>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel this booking?"
        description="Your seat or Office Hour will become available to others."
        confirmLabel="Cancel booking"
        cancelLabel="Keep booking"
        onConfirm={async () => {
          setFailure(false);
          try {
            await onCancel(booking);
            setOpen(false);
          } catch (error) {
            setFailure(true);
            throw error;
          }
        }}
      />
    </>
  );
}
