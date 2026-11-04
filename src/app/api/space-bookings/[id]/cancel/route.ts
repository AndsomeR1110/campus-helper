import { spaceHandlers, spaceResponse } from "@/features/spaces/server";
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return spaceResponse(request, async () => spaceHandlers.cancel((await context.params).id));
}
