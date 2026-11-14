import { BookOpen, CalendarDays, CalendarPlus, CalendarSync, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import {
  Card,
  EmptyState,
  ListItem,
  LocationText,
  Skeleton,
  StatusBadge,
  buttonStyles,
  cardStyles,
} from "@/components/ui";
import { WEEKDAY_LABELS, type Course } from "@/features/courses";
import { getCurrentUser, listCourses } from "@/features/courses/server";
import { classCount, formatWeeks } from "@/features/school-timetable";
import { readSchoolSync } from "@/features/school-timetable/server";
import { formatRelativeTime } from "@/lib/time";

export const metadata: Metadata = { title: "My courses" };

/** Reads the session and the database, so it must render per request. */
export const instant = false;

/** PG-12 course list — school classes are read-only here, manual ones open the editor. */
async function CourseList() {
  await connection();
  const user = await getCurrentUser();
  const [courses, sync] = await Promise.all([listCourses(user.id), readSchoolSync(user.id)]);
  const school = courses.filter((course) => course.source === "school");
  const manual = courses.filter((course) => course.source !== "school");

  return (
    <>
      <SchoolSyncCard
        count={sync.version > 0 ? sync.count : null}
        syncedAt={sync.syncedAt}
        now={new Date()}
      />
      {courses.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={CalendarDays}
            title="No courses yet"
            description="Connect your school timetable, or add a course yourself. Campus Helper will remind you before every class."
            action={
              <Link
                href="/courses/new"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                Add a course
              </Link>
            }
          />
        </Card>
      ) : school.length === 0 ? (
        <CourseGroup courses={manual} />
      ) : (
        <>
          <CourseGroup title="From school timetable" courses={school} />
          {manual.length > 0 && <CourseGroup title="Added by you" courses={manual} />}
        </>
      )}
    </>
  );
}

function SchoolSyncCard({
  count,
  syncedAt,
  now,
}: {
  count: number | null;
  syncedAt: string | null;
  now: Date;
}) {
  const connected = count !== null;
  return (
    <Link
      href="/courses/sync"
      className={cardStyles({ variant: "widget", interactive: true })}
      aria-label={connected ? "School timetable settings" : "Connect school timetable"}
    >
      <ListItem
        leading={
          <span className="flex size-10 items-center justify-center rounded-sm bg-event-class-subtle text-event-class">
            <CalendarSync aria-hidden />
          </span>
        }
        title="School timetable"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge kind="connection" status={connected ? "CONNECTED" : "NOT_CONNECTED"} />
            <span>
              {connected
                ? `${classCount(count)}${syncedAt ? ` · Synced ${formatRelativeTime(syncedAt, now)}` : ""}`
                : "Import classes from your university account"}
            </span>
          </span>
        }
        trailing={<ChevronRight className="size-5 text-text-muted" aria-hidden />}
      />
    </Link>
  );
}

function CourseGroup({ title, courses }: { title?: string; courses: Course[] }) {
  const list = (
    <ul className="flex flex-col gap-3">
      {courses.map((course) => {
        const fromSchool = course.source === "school";
        return (
          <li key={course.id}>
            <Link
              href={fromSchool ? "/courses/sync" : `/courses/${course.id}/edit`}
              aria-label={`${fromSchool ? "View school timetable for" : "Edit"} ${course.code}`}
              className={cardStyles({ interactive: true })}
            >
              <ListItem
                leading={
                  <span className="flex size-10 items-center justify-center rounded-sm bg-event-class-subtle text-event-class">
                    <BookOpen aria-hidden />
                  </span>
                }
                title={`${course.code} ${course.name}`}
                description={
                  <span className="flex flex-col gap-0.5">
                    <span className="flex flex-wrap items-center gap-x-2 tabular-nums">
                      {WEEKDAY_LABELS[course.weekday]} {course.startTime}–{course.endTime}
                      {course.location ? <LocationText location={course.location} /> : null}
                    </span>
                    {course.schoolWeeks && (
                      <span className="tabular-nums">{formatWeeks(course.schoolWeeks)}</span>
                    )}
                  </span>
                }
                trailing={<ChevronRight className="size-5 text-text-muted" aria-hidden />}
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
  if (!title) return list;
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-caption tracking-wide text-text-muted uppercase">{title}</h2>
      {list}
    </section>
  );
}

function CourseListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      <Skeleton className="h-18 rounded-md" />
      {[0, 1, 2].map((index) => (
        <Card key={index} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </Card>
      ))}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <>
      <TopBar
        title="My courses"
        variant="large"
        actions={
          <Link
            href="/courses/new"
            aria-label="Add course"
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            <CalendarPlus className="size-5" aria-hidden />
          </Link>
        }
      />
      <PageContainer>
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseList />
        </Suspense>
      </PageContainer>
    </>
  );
}
