import "server-only";

import { createScheduleEvent, groupEventsByDay, type ScheduleEvent } from "@/features/schedule";
import {
  MAX_WEEK,
  MIN_WEEK,
  TERM_START_DATE,
  getOccurrencesInWeek,
  type Course,
  type CourseOccurrence,
  type Weekday,
} from "@/features/courses";
import { listCourses } from "@/features/courses/server";

const MS_PER_DAY = 86_400_000;

/** Week 1 starts at 00:00 Asia/Shanghai, i.e. 16:00 UTC the day before. */
function termStart(): Date {
  return new Date(`${TERM_START_DATE}T00:00:00+08:00`);
}

/** Teaching week containing `now`, clamped to the semester (1…20). */
export function currentTeachingWeek(now: Date): number {
  const elapsed = Math.floor((now.getTime() - termStart().getTime()) / (7 * MS_PER_DAY)) + 1;

  return Math.min(Math.max(elapsed, MIN_WEEK), MAX_WEEK);
}

/** Monday 00:00 to Sunday 23:59:59.999 of the given teaching week. */
export function weekRange(week: number): { from: Date; to: Date } {
  const weekNumber = Math.min(Math.max(week, MIN_WEEK), MAX_WEEK);
  const from = new Date(termStart().getTime() + (weekNumber - 1) * 7 * MS_PER_DAY);

  return { from, to: new Date(from.getTime() + 7 * MS_PER_DAY - 1) };
}

const WEEKDAY_BY_INDEX: readonly Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export interface WeekViewDay {
  /** "YYYY-MM-DD" in Asia/Shanghai. */
  date: string;
  weekday: Weekday;
  events: ScheduleEvent[];
}

export interface WeekView {
  week: number;
  from: string;
  to: string;
  /** Only days that actually contain a class. */
  days: WeekViewDay[];
}

function toEvent(course: Course, occurrence: CourseOccurrence): ScheduleEvent {
  return createScheduleEvent({
    type: "CLASS",
    sourceId: occurrence.id,
    title: `${occurrence.courseCode} ${occurrence.courseName}`,
    startsAt: occurrence.startsAt,
    endsAt: occurrence.endsAt,
    location: occurrence.location,
    status: "CONFIRMED",
    href: `/courses/${course.id}/edit`,
  });
}

/** Everything the PG-11 week view renders for one teaching week. */
export async function loadWeekView(ownerId: string, week: number): Promise<WeekView> {
  const weekNumber = Math.min(Math.max(week, MIN_WEEK), MAX_WEEK);
  const courses = await listCourses(ownerId);

  const events = courses.flatMap((course) =>
    getOccurrencesInWeek(course, TERM_START_DATE, weekNumber).map((occurrence) =>
      toEvent(course, occurrence),
    ),
  );

  const { from, to } = weekRange(weekNumber);
  const days = groupEventsByDay(events).map((day) => ({
    date: day.date,
    weekday: WEEKDAY_BY_INDEX[(new Date(`${day.date}T00:00:00+08:00`).getUTCDay() + 6) % 7]!,
    events: day.events,
  }));

  return { week: weekNumber, from: from.toISOString(), to: to.toISOString(), days };
}

/** The next class from `now`, for the Home card and the schedule header. */
export async function loadNextClass(ownerId: string, now: Date): Promise<ScheduleEvent | null> {
  const week = currentTeachingWeek(now);
  const courses = await listCourses(ownerId);
  const { from } = weekRange(week);

  const events = courses
    .flatMap((course) =>
      [week, week + 1]
        .flatMap((each) => getOccurrencesInWeek(course, TERM_START_DATE, each))
        .map((occurrence) => toEvent(course, occurrence)),
    )
    .filter((event) => Date.parse(event.startsAt) >= Math.max(now.getTime(), from.getTime()))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return events[0] ?? null;
}
