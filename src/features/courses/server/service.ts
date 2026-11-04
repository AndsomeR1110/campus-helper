import { ApiError } from "@/lib/api";
import { validateCourseDraft } from "../rules";
import type { Course, CourseDraft, CourseValidationError } from "../types";
import { courseDraftSchema, type CourseDraftInput } from "../schemas";
import { findCourse, findCourses, insertCourse, removeCourse, saveCourse } from "./repository";

/** Turns the validation errors of `rules.ts` into a single 400 with field details. */
function toDraft(input: CourseDraftInput): CourseDraft {
  const draft: CourseDraft = {
    code: input.code.toUpperCase(),
    name: input.name,
    teacher: input.teacher?.trim() ?? "",
    location: input.location?.trim() ?? "",
    weekday: input.weekday,
    startTime: input.startTime,
    endTime: input.endTime,
    firstWeek: input.firstWeek,
    lastWeek: input.lastWeek,
    weekParity: input.weekParity,
    reminderOffsetMinutes: input.reminderOffsetMinutes,
  };

  const result = validateCourseDraft(draft);
  if (!result.ok) {
    const fields: Record<string, string> = {};
    for (const error of result.errors) {
      fields[error.field] ??= error.message;
    }

    throw new ApiError("VALIDATION_ERROR", firstMessage(result.errors), fields);
  }

  return draft;
}

function firstMessage(errors: CourseValidationError[]): string {
  return errors[0]?.message ?? "Check the highlighted fields.";
}

/** Parses untrusted JSON and applies both the shape and the business rules. */
export function readCourseDraft(payload: unknown): CourseDraft {
  const parsed = courseDraftSchema.safeParse(payload);

  if (!parsed.success) {
    throw new ApiError("VALIDATION_ERROR", "Check the highlighted fields.", {
      form: parsed.error.issues[0]?.message ?? "Invalid course details.",
    });
  }

  return toDraft(parsed.data);
}

export function listCourses(ownerId: string): Promise<Course[]> {
  return findCourses(ownerId);
}

export function getCourse(ownerId: string, id: string): Promise<Course> {
  return findCourse(ownerId, id);
}

export function createCourse(ownerId: string, payload: unknown): Promise<Course> {
  return insertCourse(ownerId, readCourseDraft(payload));
}

export function updateCourse(ownerId: string, id: string, payload: unknown): Promise<Course> {
  return saveCourse(ownerId, id, readCourseDraft(payload));
}

export function deleteCourse(ownerId: string, id: string): Promise<void> {
  return removeCourse(ownerId, id);
}
