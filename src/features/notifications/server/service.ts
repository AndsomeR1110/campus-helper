import "server-only";

import { TERM_START_DATE, getOccurrencesInWeek, type Course } from "@/features/courses";
import { currentTeachingWeek } from "@/features/schedule/server";
import { buildReminderNotification, isReminderDue } from "../reminder";
import { dispatchPush } from "./push";
import type { Notification } from "../types";
import {
  countUnread,
  findCoursesWithReminder,
  findNotifications,
  insertReminders,
  markAllRead,
  markRead,
} from "./repository";

export async function listForUser(userId: string): Promise<{
  items: Notification[];
  unread: number;
}> {
  const [items, unread] = await Promise.all([findNotifications(userId), countUnread(userId)]);

  return { items, unread };
}

export function readNotification(userId: string, id: string): Promise<void> {
  return markRead(userId, id);
}

export function readAll(userId: string): Promise<number> {
  return markAllRead(userId);
}

/** How far ahead the scan looks. Must cover the largest reminder offset. */
const SCAN_HORIZON_MINUTES = 60;

function asCourse(row: Awaited<ReturnType<typeof findCoursesWithReminder>>[number]): Course {
  return {
    id: row.id,
    ownerId: row.ownerId,
    code: row.code,
    name: row.name,
    teacher: null,
    weekday: row.weekday as Course["weekday"],
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    firstWeek: row.firstWeek,
    lastWeek: row.lastWeek,
    weekParity: row.weekParity as Course["weekParity"],
  };
}

export interface ReminderScanResult {
  scanned: number;
  created: number;
}

/**
 * The scheduled job (CR-AC-05, NT-AC-01). Safe to run as often as you like:
 * `dedupeKey` is unique, so a second run inserts nothing.
 */
export async function runReminderScan(now: Date): Promise<ReminderScanResult> {
  const courses = await findCoursesWithReminder();
  const horizon = new Date(now.getTime() + SCAN_HORIZON_MINUTES * 60_000);

  const candidates: Array<{
    userId: string;
    title: string;
    body: string;
    href: string;
    dedupeKey: string;
  }> = [];

  for (const row of courses) {
    const course = asCourse(row);

    // Two weeks are enough to cover a window that crosses a week boundary.
    const week = currentTeachingWeek(now);

    // Two weeks are enough to cover a window that crosses a week boundary.
    for (const each of [week, week + 1]) {
      for (const occurrence of getOccurrencesInWeek(course, TERM_START_DATE, each)) {
        const startMs = Date.parse(occurrence.startsAt);
        if (startMs < now.getTime() || startMs > horizon.getTime()) {
          continue;
        }

        if (!isReminderDue(occurrence.startsAt, row.offsetMinutes, now)) {
          continue;
        }

        const reminder = buildReminderNotification({
          courseId: course.id,
          courseCode: occurrence.courseCode,
          courseName: occurrence.courseName,
          location: occurrence.location,
          startsAt: occurrence.startsAt,
          offsetMinutes: row.offsetMinutes,
          weekNumber: occurrence.weekNumber,
        });

        candidates.push({ userId: row.ownerId, ...reminder });
      }
    }
  }

  const created = await insertReminders(candidates);

  // Wake the devices of everyone who just got a reminder (task #30). The push
  // carries no body; the service worker fetches /api/notifications itself.
  await dispatchPush(
    candidates.map((candidate) => candidate.userId),
    now,
  );

  return { scanned: candidates.length, created };
}
