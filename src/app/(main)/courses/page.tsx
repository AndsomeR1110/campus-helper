import { CalendarDays, CalendarPlus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Card, EmptyState, ListItem, Skeleton, buttonStyles } from "@/components/ui";
import { WEEKDAY_LABELS } from "@/features/courses";
import { getCurrentUser, listCourses } from "@/features/courses/server";

export const metadata: Metadata = { title: "My courses" };

/** Reads the session and the database, so it must render per request. */
export const instant = false;

/** PG-12 course list — the timetable is edited from here. */
async function CourseList() {
  await connection();
  const user = await getCurrentUser();
  const courses = await listCourses(user.id);

  if (courses.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={CalendarDays}
          title="No courses yet"
          description="Add your timetable once and Campus Helper will remind you before every class."
          action={
            <Link href="/courses/new" className={buttonStyles({ size: "sm" })}>
              Add a course
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
            href={`/courses/${course.id}/edit`}
            aria-label={`Edit ${course.code}`}
            className={buttonStyles({
              variant: "secondary",
              className: "h-auto w-full justify-start border-border bg-surface p-0 text-left",
            })}
          >
            <Card className="w-full p-4">
              <ListItem
                title={`${course.code} ${course.name}`}
                description={`${WEEKDAY_LABELS[course.weekday]} ${course.startTime}–${course.endTime}${
                  course.location ? ` · ${course.location}` : ""
                }`}
              />
            </Card>
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
