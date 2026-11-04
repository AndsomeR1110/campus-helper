import { spaceHandlers, spaceResponse } from "@/features/spaces/server";
export async function POST(request: Request) {
  return spaceResponse(request, () => spaceHandlers.POST(request));
}
export async function GET(request: Request) {
  return spaceResponse(request, () => spaceHandlers.GET());
}
