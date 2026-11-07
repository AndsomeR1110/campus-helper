import { CalendarClock, Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import {
  Button,
  EmptyState,
  Input,
  Select,
  Skeleton,
  cardStyles,
  DemoDataNotice,
} from "@/components/ui";
import { OFFICE_HOURS_MESSAGES } from "@/features/office-hours";
import { listDepartments, listTeachers } from "@/features/office-hours/server";
import { ApiError } from "@/lib/api";
import { requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = { title: "Office Hours" };

/** Cache Components: reads session + searchParams at request time. */
export const instant = false;

/**
 * PG-04 Office Hour List (OH-AC-01).
 * Filters live in URL search params so the page is shareable and survives refresh
 * (docs/frontend-architecture.md §6). Server Component queries the DB directly;
 * the proxy only redirects unauthenticated users, real permission checks run here.
 */
export default async function OfficeHoursPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; department?: string }>;
}) {
  await requireUserOrLogout();
  const { q, department } = await searchParams;

  return (
    <main className="mx-auto flex w-full max-w-list flex-col gap-6 px-5 py-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-title-lg text-text">Office Hours</h1>
        <p className="text-body-sm text-text-muted">
          Search a teacher, pick a slot, and tell them what you need help with.
        </p>
      </header>

      <DemoDataNotice />

      <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <Input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search by name, department or course…"
            aria-label="Search teachers"
          />
        </div>
        <div className="sm:w-56">
          <Select name="department" defaultValue={department ?? ""} aria-label="Department">
            <option value="">All departments</option>
            <Suspense fallback={null}>
              <DepartmentOptions />
            </Suspense>
          </Select>
        </div>
        <Button type="submit">
          <Search />
          Search
        </Button>
      </form>

      <Suspense fallback={<TeacherListSkeleton />}>
        <TeacherList q={q} department={department} />
      </Suspense>
    </main>
  );
}

async function DepartmentOptions() {
  const departments = await listDepartments();
  return (
    <>
      {departments.map((d) => (
        <option key={d} value={d}>
          {d}
        </option>
      ))}
    </>
  );
}

async function TeacherList({ q, department }: { q?: string; department?: string }) {
  const teachers = await listTeachers({ q, department });

  if (teachers.length === 0) {
    return (
      <EmptyState
        icon={Search}
        title="No teachers found"
        description={OFFICE_HOURS_MESSAGES.emptyTeachers}
        action={
          <Link href="/office-hours" className={cardStyles({ className: "px-3 py-2" })}>
            Clear search
          </Link>
        }
      />
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {teachers.map((teacher) => (
        <li key={teacher.id}>
          <Link href={`/office-hours/${teacher.id}`} className={cardStyles({ interactive: true })}>
            <div className="flex items-center gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-sm bg-primary-subtle [&_svg]:size-5 [&_svg]:text-primary">
                <CalendarClock aria-hidden />
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                <div className="truncate text-subtitle text-text">{teacher.displayName}</div>
                <div className="line-clamp-2 text-body-sm text-text-muted">
                  {teacher.department}
                  {teacher.office ? ` · Office ${teacher.office}` : ""}
                </div>
              </div>
              <span
                className={
                  teacher.openSlotCount > 0
                    ? "shrink-0 rounded-sm bg-success-subtle px-2 py-1 text-caption text-success"
                    : "shrink-0 rounded-sm bg-neutral-subtle px-2 py-1 text-caption text-neutral"
                }
              >
                {teacher.openSlotCount > 0 ? `${teacher.openSlotCount} slots` : "No slots"}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function TeacherListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-md border border-border bg-surface p-4"
        >
          <Skeleton className="size-10" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
          </div>
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
