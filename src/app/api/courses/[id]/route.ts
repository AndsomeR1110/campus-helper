import { ok, readJson, toErrorResponse } from "@/lib/api";
import { deleteCourse, getCourse, getCurrentUser, updateCourse } from "@/features/courses/server";

/** A dynamic route needs the params Promise (Next 16). */
type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
    return ok(await getCourse(user.id, id));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
    return ok(await updateCourse(user.id, id, await readJson(request)));
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const [{ id }, user] = await Promise.all([params, getCurrentUser()]);
    await deleteCourse(user.id, id);
    return ok({ id });
  } catch (error) {
    return toErrorResponse(error);
  }
}
