import {
  getViewer,
  jsonOk,
  readJson,
  setPostStatus,
  toErrorResponse,
  validationError,
} from "@/features/lost-found/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/lost-found/posts/[id]/status — the author resolves or closes (FR-LF-06). */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await readJson(request)) as { status?: unknown } | null;
    const status = body?.status;
    if (status !== "RESOLVED" && status !== "CLOSED") {
      throw validationError({ status: "Choose Resolved or Closed." });
    }
    return jsonOk({ post: setPostStatus(id, status, getViewer()) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
