import { CalendarX, Clock } from "lucide-react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import {
  DemoDataNotice,
  EmptyState,
  LocationText,
  Skeleton,
  StatusBadge,
  cardStyles,
} from "@/components/ui";
import { OFFICE_HOURS_MESSAGES, TeacherAvatar } from "@/features/office-hours";
import { getTeacherDetail, listMyBookings } from "@/features/office-hours/server";
import { ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";
import { dayKey, formatDate, formatTimeRange } from "@/lib/time";
import { cn } from "@/lib/utils";

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
    <>
      <TopBar title="Book an office hour" backHref="/office-hours" />
      <PageContainer width="content">
        <Suspense fallback={<DetailSkeleton />}>
          <TeacherDetail id={id} userId={user.id} />
        </Suspense>
      </PageContainer>
    </>
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

  const days = new Map<string, typeof slots>();
  for (const slot of slots) {
    const key = dayKey(slot.startsAt);
    days.set(key, [...(days.get(key) ?? []), slot]);
  }
  const openCount = slots.filter((slot) => slot.status === "OPEN" && !slot.isPast).length;

  return (
    <>
      <header
        className={cardStyles({
          variant: "widget",
          className: "flex flex-col items-center gap-2 py-6 text-center",
        })}
      >
        <TeacherAvatar name={teacher.displayName} size="lg" />
        <h1 className="text-title-lg text-text">{teacher.displayName}</h1>
        <p className="text-body-sm text-text-muted">{teacher.department}</p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {teacher.office ? (
            <LocationText
              location={`Office ${teacher.office}`}
              className="rounded-full bg-surface-muted px-3 py-1 text-body-sm"
            />
          ) : null}
          <span className="rounded-full bg-success-subtle px-3 py-1 text-body-sm text-success">
            {openCount} open {openCount === 1 ? "slot" : "slots"}
          </span>
        </div>
      </header>

      <DemoDataNotice />

      {slots.length === 0 ? (
        <EmptyState
          icon={CalendarX}
          title="No upcoming office hours"
          description={OFFICE_HOURS_MESSAGES.emptySlots}
        />
      ) : (
        [...days.entries()].map(([key, daySlots]) => (
          <section
            key={key}
            aria-label={formatDate(daySlots[0].startsAt)}
            className="flex flex-col gap-2"
          >
            <h2 className="text-caption tracking-wide text-text-muted uppercase">
              {formatDate(daySlots[0].startsAt)}
            </h2>
            <ul className="flex flex-col gap-2">
              {daySlots.map((slot) => {
                const bookingId = activeBookingBySlot.get(slot.id) ?? null;
                const takenByOthers = slot.bookingCount > 0 && !bookingId;
                const disabled = slot.status !== "OPEN" || slot.isPast;

                return (
                  <li
                    key={slot.id}
                    className={cardStyles({
                      className: cn(
                        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
                        bookingId && "border-primary/40 bg-primary-subtle/60",
                      ),
                    })}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        aria-hidden
                        className="flex size-12 shrink-0 flex-col items-center justify-center rounded-sm bg-event-office-subtle text-event-office"
                      >
                        <Clock className="size-5" />
                      </span>
                      <div className="flex min-w-0 flex-col gap-1">
                        <p className="text-subtitle text-text tabular-nums">
                          {formatTimeRange(slot.startsAt, slot.endsAt)}
                        </p>
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
                            <LocationText
                              location={slot.location}
                              className="text-caption text-text-muted"
                            />
                          ) : null}
                        </div>
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
          </section>
        ))
      )}
    </>
  );
}

function DetailSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="flex flex-col items-center gap-2 rounded-lg border border-border bg-surface py-6">
        <Skeleton className="size-16 rounded-full" />
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
