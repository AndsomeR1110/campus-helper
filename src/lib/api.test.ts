// @vitest-environment node
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { ApiError, toErrorResponse } from "./api";

async function body(res: Response) {
  return { status: res.status, ...(await res.json()) };
}

/** Shape of a Prisma unique-constraint error (only the fields toErrorResponse reads). */
function uniqueViolation(target: string[]) {
  return Object.assign(new Error("Unique constraint failed"), { code: "P2002", meta: { target } });
}

describe("toErrorResponse", () => {
  it("passes ApiError through with its status", async () => {
    const res = toErrorResponse(new ApiError("BOOKING_NOT_CANCELLABLE", "Too late to cancel."));
    expect(await body(res)).toEqual({
      status: 409,
      error: { code: "BOOKING_NOT_CANCELLABLE", message: "Too late to cancel." },
    });
  });

  it("turns zod errors into VALIDATION_ERROR with per-field messages", async () => {
    const result = z
      .object({ topic: z.string().min(1, "Topic is required.") })
      .safeParse({ topic: "" });
    const res = toErrorResponse(result.error);
    expect(await body(res)).toMatchObject({
      status: 400,
      error: { code: "VALIDATION_ERROR", fields: { topic: "Topic is required." } },
    });
  });

  it("maps a slot unique violation to SLOT_ALREADY_BOOKED (OH-AC-03)", async () => {
    const res = toErrorResponse(uniqueViolation(["slotId"]));
    expect(await body(res)).toMatchObject({ status: 409, error: { code: "SLOT_ALREADY_BOOKED" } });
  });

  it("does not report other unique violations as a booked slot", async () => {
    const res = toErrorResponse(uniqueViolation(["email"]));
    expect(await body(res)).toMatchObject({ status: 409, error: { code: "CONFLICT" } });
  });

  it("hides internal details of unexpected errors", async () => {
    const res = toErrorResponse(new Error("connection refused at 10.0.0.5"));
    const json = await body(res);
    expect(json).toMatchObject({ status: 500, error: { code: "INTERNAL_ERROR" } });
    expect(JSON.stringify(json)).not.toContain("10.0.0.5");
  });
});
