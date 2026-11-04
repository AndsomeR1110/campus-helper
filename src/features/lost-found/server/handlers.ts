import { z } from "zod";

import { ApiError, created, ok, readJson, toErrorResponse } from "@/lib/api";
import { LostFoundError } from "../rules";
import { claimInputSchema, postInputSchema } from "../schemas";
import type { LostFoundService } from "./service";

/**
 * Route handlers for the module, wired to `@/lib/api` so the response envelope,
 * the error codes and the 500 masking match every other module.
 *
 * No `app/api/...` file imports this yet: the routes stay unexposed until the
 * session adapter exists, the same way `features/spaces/server/handlers.ts`
 * waits for `feat/auth-and-roles`.
 */

const decisionSchema = z.strictObject({ decision: z.enum(["ACCEPT", "REJECT"]) });
const statusSchema = z.strictObject({ status: z.enum(["RESOLVED", "CLOSED"]) });

const CODE_BY_STATUS: Record<LostFoundError["status"], ApiError["code"]> = {
  400: "VALIDATION_ERROR",
  401: "UNAUTHENTICATED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
};

function response(error: unknown) {
  if (error instanceof LostFoundError) {
    return toErrorResponse(new ApiError(CODE_BY_STATUS[error.status], error.message));
  }
  return toErrorResponse(error);
}

export function createLostFoundHandlers(service: LostFoundService) {
  return {
    async createPost(request: Request) {
      try {
        return created(await service.createPost(postInputSchema.parse(await readJson(request))));
      } catch (error) {
        return response(error);
      }
    },

    async submitClaim(request: Request, postId: string) {
      try {
        return created(
          await service.submitClaim(postId, claimInputSchema.parse(await readJson(request))),
        );
      } catch (error) {
        return response(error);
      }
    },

    async decideClaim(request: Request, claimId: string) {
      try {
        const { decision } = decisionSchema.parse(await readJson(request));
        const result = await service.decideClaim(claimId, decision);
        return ok(result);
      } catch (error) {
        return response(error);
      }
    },

    async setPostStatus(request: Request, postId: string) {
      try {
        const { status } = statusSchema.parse(await readJson(request));
        return ok(await service.setPostStatus(postId, status));
      } catch (error) {
        return response(error);
      }
    },
  };
}
