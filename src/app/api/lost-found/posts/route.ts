import { createLostFoundHandlers } from "@/features/lost-found/server";

import { getLostFoundRuntime } from "@/features/lost-found/server";

/** LF-AC-01, LF-AC-02: create a post. */
export async function POST(request: Request) {
  const { service } = getLostFoundRuntime();
  return createLostFoundHandlers(service).createPost(request);
}
