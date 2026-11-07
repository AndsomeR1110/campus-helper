import { CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { EmptyState, Skeleton, StatusBadge, DemoDataNotice } from "@/components/ui";
import { ApiError } from "@/lib/api";
import { requireTeacher } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { formatDate, formatTimeRange } from "@/lib/time";
import { listSlotsForTeacher } from "@/features/office-hours/server";

import { SlotForm } from "./slot-form";

export const metadata: Metadata = { title: "My office hours" };

/** Cache Components: reads session at request time. */
export const instant = false;

/**
 * PG-07 Teacher Dashboard (OH-AC-06).
 * Teachers only see and manage their own slots: requireTeacher() + userId-scoped
 * queries on the server. Non-teachers are redirected to the student side instead
 * of getting a 500 (the API still returns 403 — AUTH-AC-04).
 */
export default async function TeacherOfficeHoursPage() {
  let user;
  try {
    user = await requireTeacher();
  } catch (error) {
    if (error instanceof ApiError) redirect("/office-hours");
    throw error;
  }

  return (
    <main className="mx-auto flex w-full max-w-[--container-list] flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg text-text">My office hours</h1>
        <p className="text-body-sm text-text-muted">
          Create slots and see how many students have booked. You can only manage your own slots.
        </p>
      </header>

      <DemoDataNotice />

      <Suspense fallback={null}>
        <TeacherProfileGate userId={user.id} />
      </Suspense>

      <Suspense fallback={<SlotListSkeleton />}>
        <SlotList userId={user.id} />
      </Suspense>

      <Link href="/office-hours" className="text-body-sm text-text-muted hover:text-text">
        ← View student side
      </Link>
    </main>
  );
}

/** Explicit hint when a TEACHER account has no profile yet (instead of an empty page). */
async function TeacherProfileGate({ userId }: { userId: string }) {
  const profile = await prisma.teacherProfile.findUnique({
    where: { userId },
    select: { displayName: true, department: true },
  });

  if (!profile) {
    return (
      <p className="rounded-md bg-warning-subtle px-4 py-3 text-body-sm text-warning">
        This account has the TEACHER role but no teacher profile yet. Ask an admin to create one.
      </p>
    );
  }

  return (
    <p className="text-body-sm text-text-muted">
      {profile.displayName} · {profile.department}
    </p>
  );
}

async function SlotList({ userId }: { userId: string }) {
  const [slots, profile] = await Promise.all([
    listSlotsForTeacher(userId),
    prisma.teacherProfile.findUnique({ where: { userId }, select: { id: true } }),
  ]);

  return (
    <>
      {profile ? <SlotForm /> : null}

      {slots.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="No office hour slots yet"
          description="Create your first slot above and students will see it immediately."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex flex-col gap-1 rounded-md border border-border bg-surface p-4 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex flex-col gap-1">
                <p className="text-subtitle text-text">
                  {formatTimeRange(slot.startsAt, slot.endsAt)}
                </p>
                <p className="text-body-sm text-text-muted">{formatDate(slot.startsAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge kind="slot" status={slot.status === "OPEN" ? "OPEN" : "CANCELLED"} />
                {slot.bookingCount > 0 ? (
                  <span className="rounded-sm bg-info-subtle px-2 py-1 text-caption text-info">
                    {slot.bookingCount} booked
                  </span>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function SlotListSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="flex h-20 items-center justify-between rounded-md border border-border bg-surface p-4"
        >
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-6 w-20" />
        </div>
      ))}
    </div>
  );
}
