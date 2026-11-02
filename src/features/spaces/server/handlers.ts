import { ApiError, created, ok, readJson, toErrorResponse, type ApiErrorCode } from "@/lib/api";
import { spaceBookingSchema } from "../schemas";
import { SpaceError } from "./rules";
import type { createSpaceService } from "./service";

/** Space codes the client needs verbatim; anything else falls back to its HTTP status. */
const SPECIFIC_CODES: Partial<Record<string, ApiErrorCode>> = {
  BOOKING_CONFLICT: "BOOKING_CONFLICT",
  INVALID_TIME_RANGE: "INVALID_TIME_RANGE",
};

const CODE_BY_STATUS: Record<SpaceError["status"], ApiErrorCode> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
};

function response(error: unknown) {
  if (error instanceof SpaceError)
    return toErrorResponse(
      new ApiError(SPECIFIC_CODES[error.code] ?? CODE_BY_STATUS[error.status], error.message),
    );
  return toErrorResponse(error);
}
/** Bind ONLY to a service constructed with the real server-session resolver.
 * No app route is exposed until auth-and-roles supplies that resolver.
 */
export function createSpaceHandlers(service: ReturnType<typeof createSpaceService>) {
  return {
    async POST(request: Request) {
      try {
        const { spaceId, ...range } = spaceBookingSchema.parse(await readJson(request));
        return created(await service.book(spaceId, range));
      } catch (error) {
        return response(error);
      }
    },
    async GET() {
      try {
        return ok(await service.listMine());
      } catch (error) {
        return response(error);
      }
    },
    async cancel(id: string) {
      try {
        return ok(await service.cancel(id));
      } catch (error) {
        return response(error);
      }
    },
  };
}
