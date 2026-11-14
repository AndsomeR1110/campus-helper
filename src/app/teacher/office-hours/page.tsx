import { CalendarPlus, ChevronRight, Clock, Eye, TriangleAlert, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { PageContainer, TopBar } from "@/components/layout";
import {
  Card,
  DemoDataNotice,
  EmptyState,
  LocationText,
  Skeleton,
  StatusBadge,
  cardStyles,
} from "@/components/ui";
import { TeacherAvatar } from "@/features/office-hours";
import { ApiError } from "@/lib/api";
import { requireTeacher } from "@/lib/auth/guards";
import { prisma } from "@/lib/db";
import { dayKey, formatDate, formatTimeRange } from "@/lib/time";
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
    <>
      <TopBar
        title="My office hours"
        backHref="/profile"
        actions={
          <Link
            href="/office-hours"
            aria-label="View student side"
            title="View student side"
            className="flex size-11 items-center justify-center rounded-full text-primary hover:bg-surface-muted"
          >
            <Eye className="size-5" aria-hidden />
          </Link>
        }
      />
      <PageContainer>
        <p className="text-body-sm text-text-muted">
          Create slots and see how many students have booked. You can only manage your own slots.
        </p>

        <DemoDataNotice />

        <Suspense fallback={<SlotListSkeleton />}>
          <TeacherDashboard userId={user.id} />
        </Suspense>
      </PageContainer>
    </>
  );
}

async function TeacherDashboard({ userId }: { userId: string }) {
  const [slots, profile] = await Promise.all([
    listSlotsForTeacher(userId),
    prisma.teacherProfile.findUnique({
      where: { userId },
      select: { id: true, displayName: true, department: true, office: true },
    }),
  ]);

  if (!profile) {
    return (
      <p className="flex items-start gap-2 rounded-md bg-warning-subtle px-4 py-3 text-body-sm text-warning">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        This account has the TEACHER role but no teacher profile yet. Ask an admin to create one.
      </p>
    );
  }

  const upcoming = slots.filter((slot) => !slot.isPast);
  const past = slots.filter((slot) => slot.isPast);
  const stats = [
    { label: "Upcoming slots", value: upcoming.filter((s) => s.status === "OPEN").length },
    {
      label: "Booked",
      value: upcoming.filter((s) => s.status === "OPEN" && s.bookingCount > 0).length,
    },
    { label: "Past slots", value: past.length },
  ];

  const days = new Map<string, typeof upcoming>();
  for (const slot of upcoming) {
    const key = dayKey(slot.startsAt);
    days.set(key, [...(days.get(key) ?? []), slot]);
  }

  return (
    <>
      <section
        aria-label="Your profile"
        className={cardStyles({ variant: "widget", className: "flex flex-col gap-4" })}
      >
        <div className="flex items-center gap-4">
          <TeacherAvatar name={profile.displayName} size="lg" />
          <div className="flex min-w-0 flex-col gap-1">
            <p className="truncate text-title text-text">{profile.displayName}</p>
            <p className="truncate text-body-sm text-text-muted">{profile.department}</p>
            {profile.office ? (
              <LocationText
                location={`Office ${profile.office}`}
                className="text-body-sm text-text-muted"
              />
            ) : null}
          </div>
        </div>
        <dl className="grid grid-cols-3 gap-2">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center gap-0.5 rounded-md bg-surface-translucent px-2 py-3"
            >
              <dd className="text-title-lg text-text tabular-nums">{stat.value}</dd>
              <dt className="text-center text-caption text-text-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      <SlotForm />

      {upcoming.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={CalendarPlus}
            title="No upcoming slots"
            description="Create a slot above and students will see it immediately."
          />
        </Card>
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
            <ul className="grid gap-2 md:grid-cols-2">
              {daySlots.map((slot) => (
                <SlotRow key={slot.id} slot={slot} />
              ))}
            </ul>
          </section>
        ))
      )}

      {past.length > 0 && (
        <details className="group flex flex-col gap-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-body-sm font-medium text-primary [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90"
              aria-hidden
            />
            Past slots ({past.length})
          </summary>
          <ul className="mt-2 grid gap-2 opacity-80 md:grid-cols-2">
            {past.map((slot) => (
              <SlotRow key={slot.id} slot={slot} showDate />
            ))}
          </ul>
        </details>
      )}
    </>
  );
}

function SlotRow({
  slot,
  showDate = false,
}: {
  slot: Awaited<ReturnType<typeof listSlotsForTeacher>>[number];
  showDate?: boolean;
}) {
  return (
    <li className={cardStyles({ className: "flex items-center gap-3" })}>
      <span
        aria-hidden
        className="flex size-11 shrink-0 items-center justify-center rounded-sm bg-event-office-subtle text-event-office"
      >
        <Clock className="size-5" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className="text-subtitle text-text tabular-nums">
          {formatTimeRange(slot.startsAt, slot.endsAt)}
          {showDate ? (
            <span className="ml-2 text-body-sm font-normal text-text-muted">
              {formatDate(slot.startsAt)}
            </span>
          ) : null}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge kind="slot" status={slot.status === "OPEN" ? "OPEN" : "CANCELLED"} />
          {slot.bookingCount > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-info-subtle px-2.5 py-0.5 text-caption text-info">
              <Users className="size-3.5" aria-hidden />
              {slot.bookingCount} booked
            </span>
          ) : null}
          {slot.location ? (
            <LocationText location={slot.location} className="text-caption text-text-muted" />
          ) : null}
        </div>
      </div>
    </li>
  );
}

function SlotListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <div className="flex items-center gap-4 rounded-lg border border-border bg-surface p-4">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-20 w-full" />
      ))}
    </div>
  );
}
