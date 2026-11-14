import { describe, expect, it } from "vitest";
import { bookingResultSchema, cancellationResultSchema } from "./schemas";
describe("SH-AC-02 confirmed school mutations", () => {
  it("rejects a booking response without an identified personal trip", () => {
    expect(bookingResultSchema.safeParse({ confirmed: true }).success).toBe(false);
    expect(bookingResultSchema.safeParse({ confirmed: false, trip: {} }).success).toBe(false);
  });
  it("requires an explicit cancellation confirmation", () => {
    for (const value of [{}, { cancelled: false }, { cancelled: "true" }]) {
      expect(cancellationResultSchema.safeParse(value).success).toBe(false);
    }
    expect(cancellationResultSchema.parse({ cancelled: true })).toEqual({ cancelled: true });
  });
});
