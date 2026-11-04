import { createLostFoundHandlers, getLostFoundRuntime } from "@/features/lost-found/server";

type Params = { params: Promise<{ id: string }> };

/** LF-AC-05: a student other than the author claims an open post. */
export async function POST(request: Request, { params }: Params) {
  const { id } = await params;
  const { service } = getLostFoundRuntime();
  return createLostFoundHandlers(service).submitClaim(request, id);
}
