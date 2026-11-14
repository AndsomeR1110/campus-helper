import "server-only";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { WEEKDAYS, type Course } from "@/features/courses";
import { normalizeSnapshot, snapshotSchema, SUPPORTED_TERM } from "../schemas";
export async function readSchoolSync(ownerId: string) {
  const row = await prisma.schoolTimetable.findUnique({ where: { ownerId } });
  return {
    version: row?.version || 0,
    syncedAt: row?.syncedAt.toISOString() || null,
    term: row ? SUPPORTED_TERM : null,
    count: row ? normalizeSnapshot(row.payload).length : 0,
  };
}
export async function saveSchoolSync(ownerId: string, input: unknown, expectedVersion: number) {
  const payload = snapshotSchema.parse(input);
  normalizeSnapshot(payload);
  try {
    return await prisma.$transaction(async (tx) => {
      if (expectedVersion === 0) {
        await tx.schoolTimetable.create({ data: { ownerId, payload } });
      } else {
        const updated = await tx.schoolTimetable.updateMany({
          where: { ownerId, version: expectedVersion },
          data: { payload, version: { increment: 1 }, syncedAt: new Date() },
        });
        if (updated.count !== 1)
          throw new ApiError(
            "CONFLICT",
            "Your timetable changed on another device. Refresh and try again.",
          );
      }
      const saved = await tx.schoolTimetable.findUniqueOrThrow({ where: { ownerId } });
      return {
        version: saved.version,
        syncedAt: saved.syncedAt.toISOString(),
        count: payload.activities.length,
        term: payload.term,
      };
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
      throw new ApiError(
        "CONFLICT",
        "Your timetable changed on another device. Refresh and try again.",
      );
    throw e;
  }
}
export async function listSchoolCourses(ownerId: string): Promise<Course[]> {
  const row = await prisma.schoolTimetable.findUnique({ where: { ownerId } });
  if (!row) return [];
  return normalizeSnapshot(row.payload).map((a) => ({
    id:
      "school-" +
      createHash("sha256")
        .update(SUPPORTED_TERM + "\0" + a.identity)
        .digest("hex")
        .slice(0, 32),
    ownerId,
    code: a.code,
    name: a.name,
    teacher: a.teacher || null,
    weekday: WEEKDAYS[a.weekday],
    startTime: a.startTime,
    endTime: a.endTime,
    location: a.location || null,
    firstWeek: a.weeks[0],
    lastWeek: a.weeks.at(-1)!,
    weekParity: "ALL",
    schoolWeeks: a.weeks,
    source: "school",
  }));
}
