import { z } from "zod";
import { ok, toErrorResponse, ApiError } from "@/lib/api";
import { getCurrentUser } from "@/features/courses/server";
import { readSchoolSync, saveSchoolSync } from "@/features/school-timetable/server";
async function readSnapshotRequest(request: Request): Promise<unknown> {
  if (!request.body) throw new ApiError("VALIDATION_ERROR", "Missing timetable request.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 500000) {
        await reader.cancel();
        throw new ApiError("VALIDATION_ERROR", "Timetable request is too large.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    throw new ApiError("VALIDATION_ERROR", "Invalid timetable request.");
  }
}
export async function GET() {
  try {
    const user = await getCurrentUser();
    return ok(await readSchoolSync(user.id), { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return toErrorResponse(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new ApiError("FORBIDDEN", "Untrusted request origin.");
    const body = z
      .object({
        snapshot: z.unknown(),
        expectedVersion: z.number().int().min(0),
        expectedActor: z.string().min(1),
      })
      .strict()
      .parse(await readSnapshotRequest(request));
    if (body.expectedActor !== user.id)
      throw new ApiError(
        "CONFLICT",
        "Your app account changed. Reopen school timetable to continue.",
      );
    return ok(await saveSchoolSync(user.id, body.snapshot, body.expectedVersion), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return toErrorResponse(e);
  }
}
