import { z } from "zod";

import { ApiError, created, ok, readJson, toErrorResponse } from "@/lib/api";
import { LostFoundError, reportInputSchema } from "@/features/lost-found";

import type { ModerationService } from "./service";

const decisionSchema = z.strictObject({ decision: z.enum(["HIDE", "DISMISS"]) });

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

export function createModerationHandlers(service: ModerationService) {
  return {
    /** LF-AC-09: a student reports a post. */
    async createReport(request: Request, postId: string) {
      try {
        return created(
          await service.createReport(postId, reportInputSchema.parse(await readJson(request))),
        );
      } catch (error) {
        return response(error);
      }
    },

    /** LF-AC-09: an administrator hides the post or dismisses the report. */
    async decideReport(request: Request, reportId: string) {
      try {
        const { decision } = decisionSchema.parse(await readJson(request));
        return ok(await service.decideReport(reportId, decision));
      } catch (error) {
        return response(error);
      }
    },
  };
}
