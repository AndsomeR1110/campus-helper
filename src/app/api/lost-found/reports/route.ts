import { createReport } from "@/features/admin/server";
import { getViewer, jsonOk, readJson, toErrorResponse } from "@/features/lost-found/server";

/** POST /api/lost-found/reports — report a post for review (LF-AC-09). */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { postId?: unknown; reason?: unknown } | null;
    const report = createReport(body?.postId, { reason: body?.reason }, getViewer());
    return jsonOk({ report }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
