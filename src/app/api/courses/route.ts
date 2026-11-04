import { created, ok, readJson, toErrorResponse } from "@/lib/api";
import { createCourse, getCurrentUser, listCourses } from "@/features/courses/server";

/** GET /api/courses — the signed-in student's timetable (PG-12). */
export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok(await listCourses(user.id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

/** POST /api/courses — create one course (FR-CR-01, CR-AC-02). */
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    return created(await createCourse(user.id, await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}
