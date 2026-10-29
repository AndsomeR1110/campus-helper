"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button, ConfirmDialog, Input, toast } from "@/components/ui";
import { OFFICE_HOURS_MESSAGES } from "@/features/office-hours";

interface SlotActionsProps {
  slotId: string;
  /** The current user's active booking for this slot, if any. */
  bookingId: string | null;
  /** Whether another student already holds the slot. */
  takenByOthers: boolean;
  disabled: boolean;
}

/**
 * Book / cancel actions for one slot (OH-AC-02 / OH-AC-03 / OH-AC-05).
 * Cancelling goes through ConfirmDialog (AGENTS.md UI rules); the resulting
 * status is decided by the server, never by the client.
 */
export function SlotActions({ slotId, bookingId, takenByOthers, disabled }: SlotActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [showReason, setShowReason] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);

  async function post(url: string, body?: unknown) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json()) as
      { data: unknown } | { error: { code: string; message: string } };

    if (!response.ok || "error" in payload) {
      throw new Error("error" in payload ? payload.error.message : "Something went wrong.");
    }
    return payload;
  }

  async function book() {
    setPending(true);
    try {
      await post("/api/office-bookings", { slotId, reason: reason.trim() || undefined });
      toast.success(OFFICE_HOURS_MESSAGES.bookSuccess);
      setShowReason(false);
      setReason("");
      router.refresh();
    } catch (error) {
      // A 409 means someone else took the slot: keep the input, explain the conflict.
      toast.error(error instanceof Error ? error.message : OFFICE_HOURS_MESSAGES.networkError);
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  async function cancel() {
    if (!bookingId) return;
    try {
      await post(`/api/office-bookings/${bookingId}/cancel`);
      toast.success(OFFICE_HOURS_MESSAGES.cancelSuccess);
      setConfirmCancel(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : OFFICE_HOURS_MESSAGES.networkError);
      // Rethrow so ConfirmDialog stays open (see its onConfirm contract).
      throw error;
    }
  }

  if (bookingId) {
    return (
      <>
        <Button
          variant="danger"
          size="sm"
          disabled={disabled}
          onClick={() => setConfirmCancel(true)}
        >
          Cancel booking
        </Button>
        <ConfirmDialog
          open={confirmCancel}
          onClose={() => setConfirmCancel(false)}
          title="Cancel this booking?"
          description="The slot goes back to the teacher's open list and another student can take it. You can book again while it is still free."
          confirmLabel="Cancel booking"
          cancelLabel="Keep booking"
          onConfirm={cancel}
        />
      </>
    );
  }

  if (takenByOthers) return null;

  if (showReason) {
    return (
      <div className="flex flex-col gap-2 sm:items-end">
        <Input
          type="text"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="What do you need help with? (optional)"
          aria-label="Reason for booking (optional)"
          maxLength={300}
          className="sm:w-64"
        />
        <div className="flex items-center gap-2">
          <Button size="sm" loading={pending} disabled={disabled} onClick={book}>
            Confirm booking
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowReason(false)}>
            Skip note
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" disabled={disabled} onClick={() => setShowReason(true)}>
      Book
    </Button>
  );
}
