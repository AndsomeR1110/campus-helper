import {
  decideClaim,
  getViewer,
  jsonOk,
  readJson,
  toErrorResponse,
  validationError,
} from "@/features/lost-found/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/lost-found/claims/[id]/decision — the author accepts or rejects (LF-AC-07). */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = (await readJson(request)) as { decision?: unknown } | null;
    const decision = body?.decision;
    if (decision !== "ACCEPT" && decision !== "REJECT") {
      throw validationError({ decision: "Choose accept or reject." });
    }
    return jsonOk({ claim: decideClaim(id, decision, getViewer()) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
