import { NextResponse } from "next/server";
import { ApiError, ok, toErrorResponse } from "@/lib/api";
import { BookingSourceUnavailable, type createBookingsService } from "./service";
export async function cancelBookingResponse(
  request: Request,
  id: string,
  service: Pick<ReturnType<typeof createBookingsService>, "cancel">,
) {
  let response: Response;
  try {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host") ?? new URL(request.url).host;
    if (origin) {
      let source: URL;
      try {
        source = new URL(origin);
      } catch {
        throw new ApiError("FORBIDDEN", "Use this app to cancel bookings.");
      }
      if (!["http:", "https:"].includes(source.protocol) || source.host !== host)
        throw new ApiError("FORBIDDEN", "Use this app to cancel bookings.");
    }
    await service.cancel(id);
    response = ok({ id, status: "CANCELLED" });
  } catch (error) {
    if (error instanceof BookingSourceUnavailable)
      response = NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: 503 },
      );
    else if (
      error instanceof Error &&
      "status" in error &&
      [400, 401, 403, 404, 409].includes(Number(error.status)) &&
      "code" in error &&
      typeof error.code === "string"
    )
      response = NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: Number(error.status) },
      );
    else response = toErrorResponse(error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
