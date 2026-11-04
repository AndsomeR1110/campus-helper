import { createLostFoundHandlers, getLostFoundRuntime } from "@/features/lost-found/server";

type Params = { params: Promise<{ id: string }> };

/** LF-AC-07: accept or reject one claim. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { service } = getLostFoundRuntime();
  return createLostFoundHandlers(service).decideClaim(request, id);
}
