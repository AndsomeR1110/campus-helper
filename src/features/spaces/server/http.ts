import { ApiError, toErrorResponse } from "@/lib/api";
/** Route wrapper: no personal response caching; reject browser cross-origin mutations. */
export async function spaceResponse(request: Request, action: () => Promise<Response>) {
  let response: Response;
  try {
    const origin = request.headers.get("origin");
    if (request.method !== "GET" && origin) {
      let source: URL;
      try {
        source = new URL(origin);
      } catch {
        throw new ApiError("FORBIDDEN", "Use this app to change your bookings.");
      }
      // Next may construct request.url with its internal listen host. Browsers
      // send the public host in Host; do not trust X-Forwarded-Host from clients.
      const host = request.headers.get("host") ?? new URL(request.url).host;
      if (!["http:", "https:"].includes(source.protocol) || source.host !== host) {
        throw new ApiError("FORBIDDEN", "Use this app to change your bookings.");
      }
    }
    response = await action();
  } catch (error) {
    response = toErrorResponse(error);
  }
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
