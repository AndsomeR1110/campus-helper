import {
  getViewer,
  jsonOk,
  readJson,
  submitClaim,
  toErrorResponse,
} from "@/features/lost-found/server";

/** POST /api/lost-found/claims — submit a private claim (LF-AC-05). */
export async function POST(request: Request) {
  try {
    const body = (await readJson(request)) as { postId?: unknown; message?: unknown } | null;
    const claim = submitClaim(
      typeof body?.postId === "string" ? body.postId : "",
      { message: body?.message },
      getViewer(),
    );
    return jsonOk({ claim }, 201);
  } catch (error) {
    return toErrorResponse(error);
  }
}
