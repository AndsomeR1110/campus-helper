import { createModerationHandlers, getModerationRuntime } from "@/features/admin/server";

type Params = { params: Promise<{ id: string }> };

/** FR-LF-08: any signed-in student reports a post for review. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { service } = getModerationRuntime();
  return createModerationHandlers(service).createReport(request, id);
}
