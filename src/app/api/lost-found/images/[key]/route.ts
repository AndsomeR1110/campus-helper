import { getLostFoundRuntime } from "@/features/lost-found/server";
import { ApiError, toErrorResponse } from "@/lib/api";

type Params = { params: Promise<{ key: string }> };

/** Serves one stored photo. The key is validated before it reaches the disk. */
export async function GET(_request: Request, { params }: Params) {
  const { key } = await params;
  const { storage } = getLostFoundRuntime();
  const stored = await storage.read(key);

  if (!stored) {
    return toErrorResponse(new ApiError("NOT_FOUND", "This photo is not available."));
  }

  const { bytes } = stored;
  const body = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  return new Response(body, {
    headers: {
      "Content-Type": stored.type,
      "Cache-Control": "private, max-age=60",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
