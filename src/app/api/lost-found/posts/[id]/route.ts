import { createLostFoundHandlers, getLostFoundRuntime } from "@/features/lost-found/server";

type Params = { params: Promise<{ id: string }> };

/** LF-AC-07 / FR-LF-06: the author marks the item resolved or closes the post. */
export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const { service } = getLostFoundRuntime();
  return createLostFoundHandlers(service).setPostStatus(request, id);
}
