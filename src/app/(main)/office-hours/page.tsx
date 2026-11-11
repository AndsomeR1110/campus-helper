import { Search } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";

import { PageContainer, TopBar } from "@/components/layout";
import {
  Button,
  EmptyState,
  Input,
  LocationText,
  Select,
  Skeleton,
  buttonStyles,
  cardStyles,
  DemoDataNotice,
} from "@/components/ui";
import { OFFICE_HOURS_MESSAGES, TeacherAvatar } from "@/features/office-hours";
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
    <>
      <TopBar title="Office Hours" backHref="/services" />
      <PageContainer>
        <p className="text-body-sm text-text-muted">
          Search a teacher, pick a slot, and tell them what you need help with.
        </p>

        <DemoDataNotice />

        <form
          method="get"
          className={cardStyles({
            variant: "widget",
            className: "flex flex-col gap-3 md:flex-row md:items-center",
          })}
        >
          <div className="relative flex-1">
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-5 -translate-y-1/2 text-text-muted"
              aria-hidden
            />
            <Input
              type="search"
              name="q"
              defaultValue={q ?? ""}
              placeholder="Search by name, department or course…"
              aria-label="Search teachers"
              className="rounded-full pl-11"
            />
          </div>
          <div className="md:w-56">
            <Select
              name="department"
              defaultValue={department ?? ""}
              aria-label="Department"
              className="rounded-full"
            >
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
      </PageContainer>
    </>
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
          <Link href="/office-hours" className={buttonStyles({ variant: "secondary", size: "sm" })}>
            Clear search
          </Link>
        }
      />
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {teachers.map((teacher) => (
        <li key={teacher.id}>
          <Link
            href={`/office-hours/${teacher.id}`}
            className={cardStyles({ interactive: true, className: "h-full" })}
          >
            <div className="flex items-center gap-3">
              <TeacherAvatar name={teacher.displayName} />
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="truncate text-subtitle text-text">{teacher.displayName}</div>
                <div className="truncate text-body-sm text-text-muted">{teacher.department}</div>
                {teacher.office ? (
                  <LocationText
                    location={`Office ${teacher.office}`}
                    className="text-body-sm text-text-muted"
                  />
                ) : null}
              </div>
              <span
                className={
                  teacher.openSlotCount > 0
                    ? "shrink-0 rounded-full bg-success-subtle px-2.5 py-1 text-caption text-success"
                    : "shrink-0 rounded-full bg-neutral-subtle px-2.5 py-1 text-caption text-neutral"
                }
              >
                {teacher.openSlotCount > 0
                  ? `${teacher.openSlotCount} ${teacher.openSlotCount === 1 ? "slot" : "slots"}`
                  : "No slots"}
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
