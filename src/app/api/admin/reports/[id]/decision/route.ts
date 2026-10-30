import { decideReport } from "@/features/admin/server";
import { jsonOk, readJson, requireAdmin, toErrorResponse } from "@/features/lost-found/server";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** POST /api/admin/reports/[id]/decision — hide the post or dismiss (LF-AC-09). */
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const viewer = requireAdmin();
    const { id } = await params;
    const body = await readJson(request);
    return jsonOk({ report: decideReport(id, body, viewer) });
  } catch (error) {
    return toErrorResponse(error);
  }
}
