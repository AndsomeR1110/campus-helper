import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import { Card, EmptyState, ListItem, Skeleton, buttonStyles } from "@/components/ui";
import { MAX_WEEK, MIN_WEEK } from "@/features/courses";
import { getCurrentUser } from "@/features/courses/server";
import { currentTeachingWeek, loadWeekView } from "@/features/schedule/server";
import { formatDate, formatTimeRange } from "@/lib/time";

export const metadata: Metadata = { title: "Schedule" };

/** Reads the session, searchParams or the database per request. */
export const instant = false;

const weekLink = buttonStyles({ variant: "ghost", size: "sm", className: "size-9 px-0" });

/** PG-11 weekly timetable (FR-CR-05 entry point, CR-AC-01). */
async function WeekTimetable({ week }: { week: number }) {
  await connection();
  const user = await getCurrentUser();
  const view = await loadWeekView(user.id, week);

  if (view.days.length === 0) {
    return (
      <Card className="p-0">
        <EmptyState
          icon={CalendarDays}
          title={`No classes in week ${view.week}`}
          description="Add your courses and they will appear here every teaching week."
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
    <div className="flex flex-col gap-5">
      {view.days.map((day) => (
        <section key={day.date} className="flex flex-col gap-2">
          <h2 className="px-1 text-subtitle text-text">
            {formatDate(`${day.date}T12:00:00+08:00`)}
          </h2>
          <ul className="flex flex-col gap-2">
            {day.events.map((event) => (
              <li key={event.id}>
                <Link href={event.href} className="block">
                  <Card className="p-4">
                    <ListItem
                      title={event.title}
                      description={
                        <span className="tabular-nums">
                          {formatTimeRange(event.startsAt, event.endsAt)}
                          {event.location ? ` · ${event.location}` : ""}
                        </span>
                      }
                      trailing={<ChevronRight className="size-5 text-text-muted" aria-hidden />}
                    />
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

function TimetableSkeleton() {
  return (
    <div className="flex flex-col gap-5" aria-hidden>
      {[0, 1].map((group) => (
        <div key={group} className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-20 w-full" />
        </div>
      ))}
    </div>
  );
}

function WeekPicker({ week }: { week: number }) {
  const previous = Math.max(MIN_WEEK, week - 1);
  const next = Math.min(MAX_WEEK, week + 1);

  return (
    <div className="flex items-center justify-between gap-3">
      <Link
        href={`/schedule?week=${previous}`}
        aria-label="Previous week"
        className={week === MIN_WEEK ? `${weekLink} pointer-events-none opacity-40` : weekLink}
      >
        <ChevronLeft aria-hidden />
      </Link>
      <p className="text-subtitle text-text tabular-nums">Week {week}</p>
      <Link
        href={`/schedule?week=${next}`}
        aria-label="Next week"
        className={week === MAX_WEEK ? `${weekLink} pointer-events-none opacity-40` : weekLink}
      >
        <ChevronRight aria-hidden />
      </Link>
    </div>
  );
}

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  // The fallback week depends on the request-time date, so opt the shell out
  // of prerendering before touching `new Date()` (Next.js unstable value).
  await connection();
  const { week: rawWeek } = await searchParams;
  const requested = Number(rawWeek);
  const week =
    Number.isInteger(requested) && requested >= MIN_WEEK && requested <= MAX_WEEK
      ? requested
      : currentTeachingWeek(new Date());

  return (
    <>
      <TopBar title="Schedule" variant="large" />
      <PageContainer>
        <WeekPicker week={week} />
        <Suspense key={week} fallback={<TimetableSkeleton />}>
          <WeekTimetable week={week} />
        </Suspense>
        <p className="text-center text-body-sm text-text-muted">
          Classes come from{" "}
          <Link href="/courses" className="text-primary underline-offset-2 hover:underline">
            your courses
          </Link>
          .
        </p>
      </PageContainer>
    </>
  );
}
