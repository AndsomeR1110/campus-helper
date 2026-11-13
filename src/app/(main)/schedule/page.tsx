import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { PageContainer, TopBar } from "@/components/layout";
import {
  Card,
  EmptyState,
  LocationText,
  Skeleton,
  TypeTag,
  buttonStyles,
  cardStyles,
} from "@/components/ui";
import { MAX_WEEK, MIN_WEEK } from "@/features/courses";
import { getCurrentUser } from "@/features/courses/server";
import { SCHEDULE_TAG_TYPE } from "@/features/schedule";
import { currentTeachingWeek, loadWeekView } from "@/features/schedule/server";
import { dayKey, formatDate, formatTime } from "@/lib/time";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Schedule" };

/** Reads the session, searchParams or the database per request. */
export const instant = false;

const weekLink = buttonStyles({ variant: "ghost", size: "sm", className: "size-10 px-0" });

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

  const now = new Date();
  const today = dayKey(now);
  const nextId = view.days
    .flatMap((day) => day.events)
    .find((event) => Date.parse(event.endsAt) > now.getTime())?.id;

  return (
    <div className="flex flex-col gap-6">
      {view.days.map((day) => {
        const isToday = day.date === today;
        const label = formatDate(`${day.date}T12:00:00+08:00`);
        return (
          <section key={day.date} aria-label={label} className="flex flex-col gap-3">
            <h2 className="flex items-center gap-2 px-1">
              <span className="text-subtitle text-text">{label}</span>
              {isToday && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-caption text-on-primary">
                  Today
                </span>
              )}
            </h2>
            <ol className="relative flex flex-col gap-3 before:absolute before:top-2 before:bottom-2 before:left-[3.75rem] before:w-px before:bg-border-strong">
              {day.events.map((event) => {
                const tag = SCHEDULE_TAG_TYPE[event.type];
                const next = event.id === nextId;
                return (
                  <li key={event.id} className="relative flex items-stretch gap-4">
                    <div className="flex w-12 shrink-0 flex-col items-end pt-3 tabular-nums">
                      <span className="text-body-sm font-semibold text-text">
                        {formatTime(event.startsAt)}
                      </span>
                      <span className="text-caption text-text-muted">
                        {formatTime(event.endsAt)}
                      </span>
                    </div>
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-4.5 left-[3.75rem] size-3 -translate-x-1/2 rounded-full ring-4 ring-background",
                        DOT[tag],
                      )}
                    />
                    <Link
                      href={event.href}
                      className={cardStyles({
                        variant: next ? "widget" : "default",
                        interactive: true,
                        className: cn(
                          "ml-2 flex min-w-0 flex-1 items-center gap-3 p-3.5",
                          next && "ring-2 ring-primary/40",
                        ),
                      })}
                    >
                      <span className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="flex items-center gap-2">
                          <TypeTag type={tag} />
                          {next && (
                            <span className="text-caption font-semibold text-primary">Up next</span>
                          )}
                        </span>
                        <span className="truncate text-subtitle text-text">{event.title}</span>
                        {event.location ? (
                          <LocationText
                            location={event.location}
                            className="text-body-sm text-text-muted"
                          />
                        ) : null}
                      </span>
                      <ChevronRight className="size-5 shrink-0 text-text-muted" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

const DOT = {
  class: "bg-event-class",
  office: "bg-event-office",
  space: "bg-event-space",
  lost: "bg-lost",
  found: "bg-found",
} as const;

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

function WeekPicker({ week, current }: { week: number; current: number }) {
  const previous = Math.max(MIN_WEEK, week - 1);
  const next = Math.min(MAX_WEEK, week + 1);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex w-full max-w-sm items-center justify-between gap-3 rounded-full border liquid-glass p-1">
        <Link
          href={`/schedule?week=${previous}`}
          aria-label="Previous week"
          className={week === MIN_WEEK ? `${weekLink} pointer-events-none opacity-40` : weekLink}
        >
          <ChevronLeft aria-hidden />
        </Link>
        <p className="flex flex-col items-center text-subtitle text-text tabular-nums">
          Week {week}
          <span className="text-caption text-text-muted">
            {week === current ? "This week" : week < current ? "Past week" : "Upcoming week"}
          </span>
        </p>
        <Link
          href={`/schedule?week=${next}`}
          aria-label="Next week"
          className={week === MAX_WEEK ? `${weekLink} pointer-events-none opacity-40` : weekLink}
        >
          <ChevronRight aria-hidden />
        </Link>
      </div>
      {week !== current && (
        <Link
          href={`/schedule?week=${current}`}
          className="text-body-sm font-medium text-primary hover:underline"
        >
          Back to this week
        </Link>
      )}
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
  const current = currentTeachingWeek(new Date());
  const week =
    Number.isInteger(requested) && requested >= MIN_WEEK && requested <= MAX_WEEK
      ? requested
      : current;

  return (
    <>
      <TopBar title="Schedule" variant="large" />
      <PageContainer>
        <WeekPicker week={week} current={current} />
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
