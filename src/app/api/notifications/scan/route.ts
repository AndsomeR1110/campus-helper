import { ApiError, ok, toErrorResponse } from "@/lib/api";
import { runReminderScan } from "@/features/notifications/server";

/**
 * POST /api/notifications/scan — the scheduled reminder job (CR-AC-05).
 *
 * Call it from a cron (GitHub Actions, Vercel Cron…) every few minutes. Set
 * `CRON_SECRET` and send `Authorization: Bearer <secret>`; without the variable
 * set (local development) the endpoint is open.
 */
export async function POST(request: Request) {
  try {
    const secret = process.env.CRON_SECRET;
    if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
      throw new ApiError("FORBIDDEN", "Invalid cron credentials.");
    }

    // Reading the clock is fine here: a route handler always runs per request.
    return ok(await runReminderScan(new Date()));
  } catch (error) {
    return toErrorResponse(error);
  }
}
