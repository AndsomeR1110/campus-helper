import { createModerationHandlers, getModerationRuntime } from "@/features/admin/server";

type Params = { params: Promise<{ id: string }> };

/** LF-AC-09: an administrator hides the reported post or dismisses the report. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { service } = getModerationRuntime();
  return createModerationHandlers(service).decideReport(request, id);
}
