import { Prisma } from "@prisma/client";
import { ApiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import type { Course, CourseDraft, WeekParity, Weekday } from "../types";

/** Row shape returned by Prisma, mapped to the module's domain type. */
type CourseRow = Prisma.CourseGetPayload<{ include: { reminderRule: true } }>;

export function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    ownerId: row.ownerId,
    code: row.code,
    name: row.name,
    teacher: row.teacher,
    weekday: row.weekday as Weekday,
    startTime: row.startTime,
    endTime: row.endTime,
    location: row.location,
    firstWeek: row.firstWeek,
    lastWeek: row.lastWeek,
    weekParity: row.weekParity as WeekParity,
  };
}

const withReminder = { reminderRule: true } as const;

export async function findCourses(ownerId: string): Promise<Course[]> {
  const rows = await prisma.course.findMany({
    where: { ownerId },
    include: withReminder,
    orderBy: [{ weekday: "asc" }, { startTime: "asc" }],
  });

  return rows.map(toCourse);
}

export async function findCourse(ownerId: string, id: string): Promise<Course> {
  const row = await prisma.course.findFirst({ where: { id, ownerId }, include: withReminder });

  if (!row) {
    throw new ApiError("NOT_FOUND", "This course does not exist.");
  }

  return toCourse(row);
}

function toUniqueConflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    throw new ApiError("CONFLICT", "You already have a class with this code at that time.");
  }

  throw error;
}

export async function insertCourse(ownerId: string, draft: CourseDraft): Promise<Course> {
  try {
    const row = await prisma.course.create({
      data: {
        ownerId,
        code: draft.code,
        name: draft.name,
        teacher: draft.teacher,
        weekday: draft.weekday,
        startTime: draft.startTime,
        endTime: draft.endTime,
        location: draft.location,
        firstWeek: draft.firstWeek,
        lastWeek: draft.lastWeek,
        weekParity: draft.weekParity,
        ...(draft.reminderOffsetMinutes === null
          ? {}
          : { reminderRule: { create: { offsetMinutes: draft.reminderOffsetMinutes } } }),
      },
      include: withReminder,
    });

    return toCourse(row);
  } catch (error) {
    return toUniqueConflict(error);
  }
}

export async function saveCourse(ownerId: string, id: string, draft: CourseDraft): Promise<Course> {
  await findCourse(ownerId, id);

  try {
    const row = await prisma.$transaction(async (tx) => {
      await tx.course.update({
        where: { id },
        data: {
          code: draft.code,
          name: draft.name,
          teacher: draft.teacher,
          weekday: draft.weekday,
          startTime: draft.startTime,
          endTime: draft.endTime,
          location: draft.location,
          firstWeek: draft.firstWeek,
          lastWeek: draft.lastWeek,
          weekParity: draft.weekParity,
        },
      });

      if (draft.reminderOffsetMinutes === null) {
        await tx.reminderRule.deleteMany({ where: { courseId: id } });
      } else {
        await tx.reminderRule.upsert({
          where: { courseId: id },
          create: { courseId: id, offsetMinutes: draft.reminderOffsetMinutes },
          update: { offsetMinutes: draft.reminderOffsetMinutes, enabled: true },
        });
      }

      return tx.course.findUniqueOrThrow({ where: { id }, include: withReminder });
    });

    return toCourse(row);
  } catch (error) {
    return toUniqueConflict(error);
  }
}

export async function removeCourse(ownerId: string, id: string): Promise<void> {
  await findCourse(ownerId, id);
  await prisma.course.delete({ where: { id } });
}
