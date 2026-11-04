import "server-only";

import { prisma } from "@/lib/db";
import type { Notification } from "../types";

type NotificationRow = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  href: string;
  dedupeKey: string;
  readAt: Date | null;
  createdAt: Date;
};

export function toNotification(row: NotificationRow): Notification {
  return {
    id: row.id,
    userId: row.userId,
    type: row.type as Notification["type"],
    title: row.title,
    body: row.body,
    href: row.href,
    dedupeKey: row.dedupeKey,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export async function findNotifications(userId: string, limit = 50): Promise<Notification[]> {
  const rows = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return rows.map(toNotification);
}

export function countUnread(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, readAt: null } });
}

export async function markRead(userId: string, id: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { id, userId, readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null },
    data: { readAt: new Date() },
  });

  return result.count;
}

/** Courses of every student that have an enabled reminder rule. */
export async function findCoursesWithReminder(): Promise<
  Array<{
    id: string;
    ownerId: string;
    code: string;
    name: string;
    location: string | null;
    weekday: string;
    startTime: string;
    endTime: string;
    firstWeek: number;
    lastWeek: number;
    weekParity: string;
    offsetMinutes: number;
  }>
> {
  const rows = await prisma.course.findMany({
    where: { reminderRule: { enabled: true } },
    include: { reminderRule: true },
  });

  return rows.flatMap((row) =>
    row.reminderRule
      ? [
          {
            id: row.id,
            ownerId: row.ownerId,
            code: row.code,
            name: row.name,
            location: row.location,
            weekday: row.weekday,
            startTime: row.startTime,
            endTime: row.endTime,
            firstWeek: row.firstWeek,
            lastWeek: row.lastWeek,
            weekParity: row.weekParity,
            offsetMinutes: row.reminderRule.offsetMinutes,
          },
        ]
      : [],
  );
}

/** Inserts only the notifications that do not exist yet (dedupeKey is unique). */
export async function insertReminders(
  rows: Array<{
    userId: string;
    title: string;
    body: string;
    href: string;
    dedupeKey: string;
  }>,
): Promise<number> {
  if (rows.length === 0) {
    return 0;
  }

  const result = await prisma.notification.createMany({
    data: rows.map((row) => ({ ...row, type: "CLASS_REMINDER" as const })),
    skipDuplicates: true,
  });

  return result.count;
}
