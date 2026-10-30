import { ApiError, created, ok, readJson, toErrorResponse } from "@/lib/api";
import { spaceBookingSchema } from "../schemas";
import { SpaceError } from "./rules";
import type { createSpaceService } from "./service";

function response(error: unknown) {
  if (error instanceof SpaceError)
    return toErrorResponse(
      new ApiError(
        error.status === 409
          ? "CONFLICT"
          : error.status === 400
            ? "VALIDATION_ERROR"
            : error.status === 401
              ? "UNAUTHENTICATED"
              : error.status === 403
                ? "FORBIDDEN"
                : "NOT_FOUND",
        error.message,
      ),
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
