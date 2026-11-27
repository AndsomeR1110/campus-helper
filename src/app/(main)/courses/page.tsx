import { getLocale, getTranslations } from "@/lib/i18n/server";
import type { Locale, Translate } from "@/lib/i18n/messages";
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

/** A school course with an inherited reminder opens the hidden manual course to manage it. */
function courseHref(course: Course) {
  if (course.inheritedReminder) return `/courses/${course.inheritedReminder.courseId}/edit`;
  return course.source === "school" ? "/courses/sync" : `/courses/${course.id}/edit`;
}

/** PG-12 course list — school classes are read-only here, manual ones open the editor. */
async function CourseList() {
  const t = await getTranslations();
  const locale = await getLocale();
  await connection();
  const user = await getCurrentUser();
  const [courses, sync] = await Promise.all([listCourses(user.id), readSchoolSync(user.id)]);
  const school = courses.filter((course) => course.source === "school");
  const manual = courses.filter((course) => course.source !== "school");

  return (
    <>
      <SchoolSyncCard
        count={sync.version > 0 && sync.syncedAt ? sync.count : null}
        syncedAt={sync.syncedAt}
        now={new Date()}
        t={t}
        locale={locale}
      />
      {courses.length === 0 ? (
        <Card className="p-0">
          <EmptyState
            icon={CalendarDays}
            title={t("No courses yet")}
            description={t(
              "Connect your school timetable, or add a course yourself. Campus Helper will remind you before every class.",
            )}
            action={
              <Link
                href="/courses/new"
                className={buttonStyles({ variant: "secondary", size: "sm" })}
              >
                {t("Add a course")}
              </Link>
            }
          />
        </Card>
      ) : school.length === 0 ? (
        <CourseGroup courses={manual} t={t} />
      ) : (
        <>
          <CourseGroup title={t("From school timetable")} courses={school} t={t} />
          {manual.length > 0 && <CourseGroup title={t("Added by you")} courses={manual} t={t} />}
        </>
      )}
    </>
  );
}

function SchoolSyncCard({
  count,
  syncedAt,
  now,
  t,
  locale,
}: {
  count: number | null;
  syncedAt: string | null;
  now: Date;
  t: Translate;
  locale: Locale;
}) {
  const connected = count !== null;
  return (
    <Link
      href="/courses/sync"
      className={cardStyles({ variant: "widget", interactive: true })}
      aria-label={connected ? t("School timetable settings") : t("Connect school timetable")}
    >
      <ListItem
        leading={
          <span className="flex size-10 items-center justify-center rounded-sm bg-event-class-subtle text-event-class">
            <CalendarSync aria-hidden />
          </span>
        }
        title={t("School timetable")}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <StatusBadge kind="connection" status={connected ? "CONNECTED" : "NOT_CONNECTED"} />
            <span>
              {connected
                ? `${classCount(count)}${syncedAt ? ` · ${t("Synced {time}", { time: formatRelativeTime(syncedAt, now, locale) })}` : ""}`
                : t("Import classes from your university account")}
            </span>
          </span>
        }
        trailing={<ChevronRight className="size-5 text-text-muted" aria-hidden />}
      />
    </Link>
  );
}

function CourseGroup({ title, courses, t }: { title?: string; courses: Course[]; t: Translate }) {
  const list = (
    <ul className="flex flex-col gap-3">
      {courses.map((course) => {
        const fromSchool = course.source === "school";
        return (
          <li key={course.id}>
            <Link
              href={courseHref(course)}
              aria-label={t(
                fromSchool && !course.inheritedReminder ? "View school {name}" : "Edit {name}",
                { name: course.code },
              )}
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
                      {t(WEEKDAY_LABELS[course.weekday])} {course.startTime}–{course.endTime}
                      {course.location ? <LocationText location={course.location} /> : null}
                      {course.inheritedReminder ? (
                        <span>
                          {t("{count} min before class", {
                            count: course.inheritedReminder.offsetMinutes,
                          })}
                        </span>
                      ) : null}
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
        <Suspense fallback={<CourseListSkeleton />}>
          <CourseList />
        </Suspense>
      </PageContainer>
    </>
  );
}
