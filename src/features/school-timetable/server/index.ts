import "server-only";
import { Prisma } from "@prisma/client";
import { createHash } from "node:crypto";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { WEEKDAYS, type Course } from "@/features/courses";
import { normalizeSnapshot, snapshotSchema, SUPPORTED_TERM, type SchoolClass } from "../schemas";
/**
 * A stored snapshot from an earlier term (or one that no longer passes stricter rules) is
 * treated as absent, so the courses and schedule pages keep working until the next sync.
 */
function storedClasses(payload: unknown): SchoolClass[] | null {
  try {
    return normalizeSnapshot(payload);
  } catch {
    return null;
  }
}
export async function readSchoolSync(ownerId: string) {
  const row = await prisma.schoolTimetable.findUnique({ where: { ownerId } });
  const classes = row ? storedClasses(row.payload) : null;
  return {
    // Keep the stored version even for a stale snapshot so the next sync can replace it.
    version: row?.version || 0,
    syncedAt: classes ? row!.syncedAt.toISOString() : null,
    term: classes ? SUPPORTED_TERM : null,
    count: classes?.length ?? 0,
  };
}
export async function saveSchoolSync(ownerId: string, input: unknown, expectedVersion: number) {
  const payload = snapshotSchema.parse(input);
  try {
    normalizeSnapshot(payload);
  } catch (e) {
    throw new ApiError(
      "VALIDATION_ERROR",
      e instanceof Error ? e.message : "Invalid school timetable.",
    );
  }
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
  const classes = row ? storedClasses(row.payload) : null;
  if (!classes) return [];
  return classes.map((a) => ({
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
