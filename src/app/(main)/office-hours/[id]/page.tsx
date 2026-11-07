import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { EmptyState, Skeleton, StatusBadge, DemoDataNotice } from "@/components/ui";
import { OFFICE_HOURS_MESSAGES } from "@/features/office-hours";
import { getTeacherDetail, listMyBookings } from "@/features/office-hours/server";
import { ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { formatDate, formatTimeRange } from "@/lib/time";

import { SlotActions } from "./slot-actions";

export const metadata: Metadata = { title: "Teacher detail" };

/** Cache Components: reads session + params at request time. */
export const instant = false;

/**
 * PG-05 Teacher Detail (OH-AC-02 / OH-AC-03 / OH-AC-04 / OH-AC-05).
 * Shows the teacher's future slots with book / cancel actions.
 */
export default async function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserOrLogout();
  const { id } = await params;

  return (
    <main className="mx-auto flex w-full max-w-list flex-col gap-6 px-5 py-8">
      <Link
        href="/office-hours"
        className="flex items-center gap-1.5 text-body-sm text-text-muted hover:text-text"
      >
        <ArrowLeft className="size-4" aria-hidden />
        Back to Office Hours
      </Link>

      <Suspense fallback={<DetailSkeleton />}>
        <TeacherDetail id={id} userId={user.id} />
      </Suspense>
    </main>
  );
}

async function TeacherDetail({ id, userId }: { id: string; userId: string }) {
  const [detail, myBookings] = await Promise.all([
    getTeacherDetail(id, userId),
    listMyBookings(userId),
  ]);

  if (!detail) notFound();

  const { teacher, slots } = detail;
  const activeBookingBySlot = new Map(
    myBookings.filter((b) => b.status === "CONFIRMED").map((b) => [b.slotId, b.id] as const),
  );

  return (
    <>
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg text-text">{teacher.displayName}</h1>
        <p className="text-body-sm text-text-muted">
          {teacher.department}
          {teacher.office ? ` · Office ${teacher.office}` : ""}
        </p>
      </header>

      <DemoDataNotice />

      {slots.length === 0 ? (
        <EmptyState
          title="No upcoming office hours"
          description={OFFICE_HOURS_MESSAGES.emptySlots}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => {
            const bookingId = activeBookingBySlot.get(slot.id) ?? null;
            const takenByOthers = slot.bookingCount > 0 && !bookingId;
            const disabled = slot.status !== "OPEN" || slot.isPast;

            return (
              <li
                key={slot.id}
                className="flex flex-col gap-3 rounded-md border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex flex-col gap-1.5">
                  <p className="text-subtitle text-text">
                    {formatTimeRange(slot.startsAt, slot.endsAt)}
                  </p>
                  <p className="text-body-sm text-text-muted">{formatDate(slot.startsAt)}</p>

                  <div className="flex flex-wrap items-center gap-2">
                    {slot.status !== "OPEN" ? (
                      <StatusBadge kind="slot" status="CANCELLED" />
                    ) : bookingId ? (
                      <StatusBadge kind="booking" status="CONFIRMED" />
                    ) : takenByOthers ? (
                      <StatusBadge kind="slot" status="BOOKED" />
                    ) : (
                      <StatusBadge kind="slot" status="OPEN" />
                    )}
                    {slot.location ? (
                      <span className="text-caption text-text-muted">{slot.location}</span>
                    ) : null}
                  </div>
                </div>

                <SlotActions
                  slotId={slot.id}
                  bookingId={bookingId}
                  takenByOthers={takenByOthers}
                  disabled={disabled}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="flex flex-col gap-2">
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex h-20 items-center justify-between rounded-md border border-border bg-surface p-4"
        >
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="h-9 w-20" />
        </div>
      ))}
    </div>
  );
}

/** requireUser() plus a redirect through /api/auth/logout when the session is
 * invalid (stale cookie for a deleted user): clears the cookie and lands on
 * /login instead of raising an error loop. */
async function requireUserOrLogout() {
  try {
    return await requireUser();
  } catch (error) {
    if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
      redirect("/api/auth/logout?next=/office-hours");
    }
    throw error;
  }
}
