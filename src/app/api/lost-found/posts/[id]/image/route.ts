import { MAX_IMAGE_BYTES } from "@/features/lost-found";
import { getLostFoundRuntime } from "@/features/lost-found/server";
import { ApiError, ok, toErrorResponse } from "@/lib/api";

type Params = { params: Promise<{ id: string }> };

/**
 * LF-AC-03. The bytes are read here, sniffed in the service and written outside
 * `public/`; the post only stores the URL the GET route below answers.
 */
export async function POST(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const photo = form.get("photo");
    if (!(photo instanceof File)) {
      throw new ApiError("VALIDATION_ERROR", "Choose a photo first.");
    }
    if (photo.size > MAX_IMAGE_BYTES) {
      throw new ApiError("VALIDATION_ERROR", "Photos must be 5 MB or smaller.");
    }

    const bytes = new Uint8Array(await photo.arrayBuffer());
    const { service } = getLostFoundRuntime();
    return ok(await service.attachImage(id, { name: photo.name, declaredType: photo.type, bytes }));
  } catch (error) {
    return toErrorResponse(error);
  }
}
