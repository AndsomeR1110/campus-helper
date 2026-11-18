import { getTranslations } from "@/lib/i18n/server";
import { BookOpen, CalendarDays, CalendarPlus, ChevronRight } from "lucide-react";
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
  buttonStyles,
  cardStyles,
} from "@/components/ui";
import { WEEKDAY_LABELS } from "@/features/courses";
import { getCurrentUser, listCourses } from "@/features/courses/server";

export const metadata: Metadata = { title: "My courses" };

/** Reads the session and the database, so it must render per request. */
export const instant = false;

/** PG-12 course list — the timetable is edited from here. */
async function CourseList() {
  const t = await getTranslations();
  await connection();
  const user = await getCurrentUser();
  const courses = await listCourses(user.id);

  if (courses.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={CalendarDays}
          title={t("No courses yet")}
          description={t(
            "Add your timetable once and Campus Helper will remind you before every class.",
          )}
          action={
            <Link href="/courses/new" className={buttonStyles({ size: "sm" })}>
              {t("Add a course")}
            </Link>
          }
        />
      </Card>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {courses.map((course) => (
        <li key={course.id}>
          <Link
            href={course.source === "school" ? "/courses/sync" : `/courses/${course.id}/edit`}
            aria-label={t(course.source === "school" ? "View school {name}" : "Edit {name}", {
              name: course.code,
            })}
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
                <span className="flex flex-wrap items-center gap-x-2 tabular-nums">
                  {t(WEEKDAY_LABELS[course.weekday])} {course.startTime}–{course.endTime}
                  {course.location ? <LocationText location={course.location} /> : null}
                </span>
              }
              trailing={<ChevronRight className="size-5 text-text-muted" aria-hidden />}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function CourseListSkeleton() {
  return (
    <div className="flex flex-col gap-3" aria-hidden>
      {[0, 1, 2].map((index) => (
        <Card key={index} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56" />
        </Card>
      ))}
    </div>
  );
}

export default async function CoursesPage() {
  const t = await getTranslations();
  return (
    <>
      <TopBar
        title={t("My courses")}
        variant="large"
        actions={
          <Link
            href="/courses/new"
            aria-label={t("Add course")}
            className={buttonStyles({ variant: "ghost", size: "sm" })}
          >
            <CalendarPlus className="size-5" aria-hidden />
          </Link>
        }
      />
      <PageContainer>
        <Link
          href="/courses/sync"
          className={buttonStyles({ variant: "secondary", className: "mb-4" })}
        >
          {t("Connect school timetable")}
        </Link>
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseList />
        </Suspense>
      </PageContainer>
    </>
  );
}
